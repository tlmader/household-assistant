#!/usr/bin/env node
// Minimal stdio MCP server exposing the YNAB transaction reads that the
// vendored `ynab-mcp-server` omits (it only surfaces *unapproved* transactions).
// Hand-rolled JSON-RPC over stdio — no framework, depends only on the `ynab`
// SDK that the project already installs. Amounts are returned in dollars.
import * as ynab from "ynab";

const TOKEN = process.env.YNAB_API_TOKEN || "";
const DEFAULT_BUDGET = process.env.YNAB_BUDGET_ID || "";
const api = new ynab.API(TOKEN);
const SERVER_INFO = { name: "ynab-transactions", version: "1.0.0" };

const TOOLS = [
  {
    name: "list_transactions",
    description:
      "List posted YNAB transactions for a budget, newest first. Returns date, amount (dollars), payee, category, memo, account, and cleared/approved flags. Use for spending drill-downs and any payee- or keyword-level search (donations, insurance premiums, subscriptions, tax payments) — filter the returned rows yourself, since YNAB has no server-side text search.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDate: { type: "string", description: "Only transactions on/after this ISO date (YYYY-MM-DD). Defaults to 1 year ago." },
        budgetId: { type: "string", description: "Budget id (optional; defaults to YNAB_BUDGET_ID)." },
      },
    },
  },
  {
    name: "transactions_by_category",
    description:
      "List YNAB transactions for a single category (by category id), newest first. Use to drill into a category flagged by budget_summary.",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "The YNAB category id." },
        sinceDate: { type: "string", description: "Only transactions on/after this ISO date (YYYY-MM-DD). Defaults to 1 year ago." },
        budgetId: { type: "string", description: "Budget id (optional; defaults to YNAB_BUDGET_ID)." },
      },
      required: ["categoryId"],
    },
  },
];

function oneYearAgoISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function shape(txns) {
  return txns
    .filter((t) => !t.deleted)
    .map((t) => ({
      date: t.date,
      amount: +(t.amount / 1000).toFixed(2),
      payee_name: t.payee_name,
      category_name: t.category_name,
      memo: t.memo,
      account_name: t.account_name,
      approved: t.approved,
      cleared: t.cleared,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function callTool(name, args) {
  const budgetId = args.budgetId || DEFAULT_BUDGET;
  if (!budgetId) throw new Error("No budgetId provided and YNAB_BUDGET_ID is unset.");
  const since = args.sinceDate || oneYearAgoISO();
  if (name === "list_transactions") {
    const resp = await api.transactions.getTransactions(budgetId, since);
    const rows = shape(resp.data.transactions);
    return { transaction_count: rows.length, since_date: since, transactions: rows };
  }
  if (name === "transactions_by_category") {
    if (!args.categoryId) throw new Error("categoryId is required.");
    const resp = await api.transactions.getTransactionsByCategory(budgetId, args.categoryId, since);
    const rows = shape(resp.data.transactions);
    return { transaction_count: rows.length, since_date: since, category_id: args.categoryId, transactions: rows };
  }
  throw new Error(`Unknown tool: ${name}`);
}

// ---- JSON-RPC over stdio (newline-delimited) ----
function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function reply(id, result) { send({ jsonrpc: "2.0", id, result }); }
function fail(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

let buf = "";
process.stdin.on("data", async (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const { id, method, params } = msg;
    try {
      if (method === "initialize") {
        reply(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: SERVER_INFO });
      } else if (method === "tools/list") {
        reply(id, { tools: TOOLS });
      } else if (method === "tools/call") {
        const out = await callTool(params.name, params.arguments || {});
        reply(id, { content: [{ type: "text", text: JSON.stringify(out) }] });
      } else if (id !== undefined) {
        fail(id, -32601, `Method not found: ${method}`);
      }
    } catch (e) {
      if (id !== undefined) fail(id, -32603, e instanceof Error ? e.message : String(e));
    }
  }
});
