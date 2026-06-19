# YNAB Budgeter

Read and manage your [YNAB](https://www.ynab.com/) budget from Claude Code. Two local MCP servers expose your accounts, categories, income, goals, and transactions, and a dozen finance skills turn that data into net-worth statements, debt-payoff plans, spending reviews, and subscription audits.

Your YNAB token stays in your local Claude config. Only the API calls to YNAB leave your machine.

## Setup

You need Node, [pnpm](https://pnpm.io/), and a YNAB account. Run these from the repo root.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a YNAB personal access token at <https://app.ynab.com/settings/developer>.

3. Register both MCP servers. Local scope keeps the token in `~/.claude.json`, out of the repo:

   ```bash
   claude mcp add ynab-mcp-server \
     -e YNAB_API_TOKEN=<your-token> \
     -- node node_modules/ynab-mcp-server/dist/index.js

   claude mcp add ynab-transactions \
     -e YNAB_API_TOKEN=<your-token> \
     -- node mcp-servers/ynab-transactions/index.mjs
   ```

   To default to one budget, add `-e YNAB_BUDGET_ID=<budget-id>` to each command. Run the `list_budgets` tool to find your budget IDs.

4. Reload Claude Code. MCP tools and skills register on reload.

Then ask Claude "what's my net worth?", "plan my debt payoff", or "find unused subscriptions".

## Why two MCP servers

`budget_summary` from the vendored [`ynab-mcp-server`](https://github.com/calebl/ynab-mcp-server) returns accounts, balances, categories, income, and goals — enough for most skills. But that server can't read posted transactions: its one transaction-read tool is fixed to return only *unapproved* transactions. Skills that search by payee or date — subscriptions, donations, insurance, tax payments — need the full history.

So this repo adds `ynab-transactions`, a small stdio server that exposes the reads the vendored one omits. Together they cover the whole surface the skills depend on.

**Run the vendored server from its real path, not `npx`.** Under `npx`, its framework resolves the tools directory from the `.bin` symlink and loads zero tools. The setup above runs it from `node_modules` to avoid that.

| Server | Tools |
| --- | --- |
| `ynab-mcp-server` | `list_budgets`, `budget_summary`, `get_unapproved_transactions`, `create_transaction`, `approve_transaction` |
| `ynab-transactions` | `list_transactions`, `transactions_by_category` |

## Skills

Twelve finance skills, adapted from [openaccountant/skills](https://github.com/openaccountant/skills) to run on YNAB. Each one falls back to a manual procedure when YNAB can't supply the data. Claude invokes them on its own when your request matches:

| Skill | What it does |
| --- | --- |
| `net-worth` | Assets minus liabilities from your account balances |
| `debt-payoff` | Avalanche or snowball plan with a month-by-month schedule |
| `emergency-fund` | Target from essential expenses; months to 3/4/6× coverage |
| `financial-goals` | Progress against YNAB's category goals |
| `zero-based-budget` | Give every dollar a job until to-be-budgeted reaches zero |
| `lifestyle-creep` | Categories that crept upward over 6–12 months |
| `spending-review` | Month-over-month spending by category, with transaction drill-down |
| `subscription-audit` | Recurring charges, total cost, and cancellation candidates |
| `charitable-giving` | Donations by organization and their deduction value |
| `insurance-audit` | Premiums by type, annualized, against benchmark ranges |
| `state-tax-estimator` | State income tax from income and state of residence |
| `tax-penalty-calc` | IRS underpayment penalty (Form 2210) |

A thirteenth skill, [`writing-great-skills`](https://github.com/mattpocock/skills), is a reference for authoring skills. Invoke it by name with `/writing-great-skills`; Claude won't trigger it on its own.

The finance skills give estimates, not tax or financial advice. Check anything that matters with a professional.

## Conventions

Claude reads, summarizes, categorizes, and creates *unapproved* transactions. It does not approve transactions or move money — you do that yourself.

## Layout

```
.claude/skills/         the 13 skills
mcp-servers/
  ynab-transactions/    the in-repo transaction server
CLAUDE.md               project instructions and the YNAB data surface
```
