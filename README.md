# Household assistant

A working example of a household assistant built on [Claude Code](https://claude.com/claude-code). It reads your real household finances — [YNAB](https://www.ynab.com/) budgets, [Wave](https://www.waveapps.com/) books, and Fidelity holdings — and bundles finance, Google Workspace, and productivity skills, so you can ask questions and plan: "what's my net worth?", "plan my debt payoff", "find unused subscriptions", "draft this week's agenda".

Your secrets stay on your machine. The MCP servers read tokens from your local environment and call out only to the services you connect.

## Why this exists

Most personal-finance automation lives behind a dashboard you can't read or extend. This repo is the opposite: a small Claude Code project you clone, point at your own accounts, and change. It shows how to wire MCP servers and skills into one assistant that answers household questions and helps you plan — net worth, spending, taxes, subscriptions, calendars, documents — without handing your data to a third party.

Treat it as a reference, not a product. Read the code, keep what fits, replace the rest.

## Setup

You need [Node](https://nodejs.org/) 18+, [pnpm](https://pnpm.io/), and a YNAB account. Run these from the repo root.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a YNAB personal access token at <https://app.ynab.com/settings/developer>.

3. Supply your secrets. The three MCP servers are already registered in the committed `.mcp.json` — you do **not** run `claude mcp add`. Instead, put your tokens where Claude Code can read them: either export them in the shell you launch Claude Code from, or add an `"env"` block to `.claude/settings.local.json` (gitignored). Copy [`.env.example`](.env.example) for the full list. The minimum:

   ```jsonc
   // .claude/settings.local.json
   { "env": { "YNAB_API_TOKEN": "…", "YNAB_BUDGET_ID": "…" } }
   ```

4. Reload Claude Code. MCP tools and skills register on reload.

5. (Optional) Connect Fidelity. Run `/mcp`, pick `snaptrade`, and approve read-only access in the browser. SnapTrade uses OAuth, so it needs no token in your config.

Then ask Claude "what's my net worth?", "plan my debt payoff", or "find unused subscriptions".

## What's connected

Three MCP servers, registered in [`.mcp.json`](.mcp.json):

| Server | Where it lives | Access | What it reads |
| --- | --- | --- | --- |
| `ynab-mcp-server` | git dependency (pinned commit) | read + create | Budgets, accounts, categories, income, goals, and transactions by date, account, category, or payee |
| `wave` | in-repo | read-only | Wave accounting books, over the public GraphQL API |
| `snaptrade` | hosted, OAuth | read-only | Connected brokerage accounts (Fidelity) — balances, positions, activity |

Claude creates only *unapproved* YNAB transactions; it never approves, updates, deletes, imports, or bulk-approves them, and never moves money (see [Conventions](#conventions)) — even though the pinned `ynab-mcp-server` commit registers write tools for all of those. The `wave` and `snaptrade` servers are read-only by construction — `wave` rejects any GraphQL `mutation`, and SnapTrade exposes no write tools.

### The YNAB server

One server covers the whole YNAB surface the skills depend on. `ynab_budget_summary` from the [`ynab-mcp-server`](https://github.com/calebl/ynab-mcp-server) dependency returns accounts, balances, categories, income, and goals; `ynab_get_transactions` returns register transactions filtered by date, account, category, or payee, so skills that search by payee or date — subscriptions, donations, insurance, tax payments — can see your full history.

`.mcp.json` launches the server from its built entrypoint, `node node_modules/ynab-mcp-server/dist/index.js`. Because the dependency is pinned to a git commit, pnpm builds its TypeScript to `dist/` on install (via the `onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml`); the launch path points straight at that build.

## Skills

Claude invokes most skills on its own when your request matches. They fall into three groups.

**Finance (12)** — adapted from [`openaccountant/skills`](https://github.com/openaccountant/skills) (`personal/`) and rewired to run on YNAB. Each falls back to a manual procedure when YNAB can't supply the data.

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

**Google Workspace (44)** — the `gws-*` skills, from [`googleworkspace/cli`](https://github.com/googleworkspace/cli). They drive Gmail, Calendar, Drive, Sheets, Docs, Chat, Tasks, and more through a `gws` command-line tool, plus cross-service workflows (meeting prep, weekly digest, email-to-task). They need the `gws` binary on your `PATH` — see the [googleworkspace/cli](https://github.com/googleworkspace/cli) install instructions.

**Productivity (5)** — from [`mattpocock/skills`](https://github.com/mattpocock/skills): `grill-me` and `grilling` stress-test a plan before you build it, `handoff` writes a session handoff, `teach` runs a teaching loop, and `writing-great-skills` is a reference for authoring skills. Invoke these by name; Claude won't trigger them on its own.

The finance skills give estimates, not tax or financial advice. Check anything that matters with a professional.

## Conventions

Claude reads, summarizes, categorizes, and creates *unapproved* transactions. It does not approve, update, delete, import, or bulk-approve transactions, edit category budgets, or move money — you do that yourself, even though the YNAB server exposes tools for all of them. Headings and filenames use sentence case; proper nouns keep their casing.

## Personal data vault (optional)

Point Claude at a local source of truth — for example an Obsidian vault with one structured note per account, policy, or asset — by setting `PERSONAL_VAULT_PATH`. When set, Claude reads the vault first for finance and records questions and refreshes it from the underlying sources (YNAB, portals) when a note goes stale. See [CLAUDE.md](CLAUDE.md) for the full data surface the skills build on.

## Layout

```
.claude/skills/         finance, Google Workspace (gws-*), and productivity skills
mcp-servers/
  wave/                 in-repo read-only Wave GraphQL server
.mcp.json               registers the three MCP servers
.env.example            the secrets each server expects
CLAUDE.md               project instructions and the YNAB data surface
```

## Security

Never commit tokens. Secrets belong in your shell environment or `.claude/settings.local.json`, both kept out of git. See [SECURITY.md](SECURITY.md) for how secrets are handled and how to report a problem.

## License

Released under the [MIT License](LICENSE). The bundled skills are vendored from [`openaccountant/skills`](https://github.com/openaccountant/skills) (MIT), [`mattpocock/skills`](https://github.com/mattpocock/skills) (MIT), and [`googleworkspace/cli`](https://github.com/googleworkspace/cli) (Apache-2.0); their license and attribution notices are reproduced in [NOTICE](NOTICE).
