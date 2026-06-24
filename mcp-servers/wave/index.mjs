#!/usr/bin/env node
// Minimal stdio MCP server exposing READ-ONLY access to Wave accounting via
// Wave's public GraphQL API (https://gql.waveapps.com/graphql/public).
// Hand-rolled JSON-RPC over stdio — no framework, no deps (uses global fetch,
// Node 18+). The token is read from WAVE_FULL_ACCESS_TOKEN and never stored here.
//
// Read-only by construction: the `graphql` tool rejects any operation containing
// a `mutation`, so this server can never write to the books — consistent with the
// project rule of never moving money or mutating financial data.

const TOKEN = process.env.WAVE_FULL_ACCESS_TOKEN || "";
const DEFAULT_BUSINESS = process.env.WAVE_BUSINESS_ID || ""; // optional default business
const ENDPOINT = "https://gql.waveapps.com/graphql/public";
const SERVER_INFO = { name: "wave", version: "1.0.0" };

async function gql(query, variables = {}) {
  if (!TOKEN) throw new Error("WAVE_FULL_ACCESS_TOKEN is unset.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("Wave GraphQL error: " + JSON.stringify(json.errors));
  return json.data;
}

const TOOLS = [
  {
    name: "list_businesses",
    description:
      "List the Wave businesses this token can access (id, name, isPersonal). Use the id with the `graphql` tool's $businessId. A default business id can be set via the WAVE_BUSINESS_ID env.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "graphql",
    description:
      "Run a READ-ONLY GraphQL query against Wave's public API (https://gql.waveapps.com/graphql/public) and return the data. Mutations are rejected. Pass the GraphQL `query` string and optional `variables`. The schema is introspectable (send a standard __schema query) — use it to discover fields for accounts, transactions, invoices, and reports. Default business id is available as the WAVE_BUSINESS_ID env; pass it as a variable in your query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A GraphQL query (no mutations)." },
        variables: { type: "object", description: "Optional GraphQL variables object." },
      },
      required: ["query"],
    },
  },
];

async function callTool(name, args) {
  if (name === "list_businesses") {
    const data = await gql(
      `query { businesses(page: 1, pageSize: 50) { edges { node { id name isPersonal isArchived } } } }`
    );
    const businesses = (data.businesses?.edges || []).map((e) => e.node);
    return { default_business_id: DEFAULT_BUSINESS || null, business_count: businesses.length, businesses };
  }
  if (name === "graphql") {
    const q = String(args.query || "");
    if (!q.trim()) throw new Error("query is required.");
    if (/\bmutation\b/i.test(q)) throw new Error("This server is read-only; mutations are not allowed.");
    const data = await gql(q, args.variables || {});
    return { data };
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
