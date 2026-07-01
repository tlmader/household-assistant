# Household assistant

This project integrates the [YNAB MCP server](https://github.com/calebl/ynab-mcp-server) so Claude can read and manage YNAB budgets.

## Personal data vault (optional)

If you keep a curated, local source of truth for personal-finance and records questions — for example an Obsidian vault with one structured note per entity (accounts, loans, assets, insurance policies, subscriptions, tax filings, equity grants, trips, medical history) — point Claude at it with the `PERSONAL_VAULT_PATH` env var (set in `~/.claude.json`, not committed).

When a vault is configured, read it first for any question about accounts, net worth, insurance, investments, loans, taxes, subscriptions, travel, or medical history. The vault is the digested answer; YNAB and other portals are the underlying sources you refresh it from. Give each note an `as_of_date` and re-pull from the named source when it's stale.

When a note's facts come from a Google Drive document, always include a clickable Drive link: carry a `source_doc_ref` link in the frontmatter and make every Drive reference in the body clickable too, never a bare id. Use the plain link form with no tracking parameters (write `https://drive.google.com/file/d/FILE_ID/view`, not `...?usp=sharing`). Verify the id resolves before linking and never invent one; when the source is a live portal with no Drive document, label that source instead of fabricating a link.

## Budgets

Configure your own YNAB budgets. The `YNAB_BUDGET_ID` env var (set in `~/.claude.json`, never committed) selects the default budget used when none is specified; pass `budgetId` to target another. Run `ynab_list_budgets` to see the budgets on your account.

## MCP servers

Two local stdio servers plus SnapTrade's hosted server, configured in the project-scoped **`.mcp.json`** (committed — no secrets: the local servers reference env vars only, and SnapTrade authenticates over OAuth). Supply the local secrets via your shell environment or the gitignored `settings.local.json` `"env"` block: `YNAB_API_TOKEN`, `YNAB_BUDGET_ID`, `WAVE_FULL_ACCESS_TOKEN` (optional `WAVE_BUSINESS_ID`). Do **not** also define these servers in `~/.claude.json` — that double-registers them.

1. **`ynab-mcp-server`** ([`calebl/ynab-mcp-server`](https://github.com/calebl/ynab-mcp-server)) — launched from its built install path: `node node_modules/ynab-mcp-server/dist/index.js`. **Pinned to a `main` commit, not the npm release:** the published `0.1.2` exposes no tool for reading *posted* transactions (only unapproved), so we track `main` until a release ships them (see issues [#29](https://github.com/calebl/ynab-mcp-server/issues/29) / [#30](https://github.com/calebl/ynab-mcp-server/issues/30)). A git-hosted dependency ships TypeScript source, so `pnpm install` runs its `prepare` build (`tsc`) to produce `dist/`; pnpm v10 blocks dependency build scripts by default, so the package is allowlisted in **`pnpm-workspace.yaml`** under `onlyBuiltDependencies`. Drop the pin and the allowlist once a published release carries the transaction reads.
   - Tools (16, all prefixed `ynab_`). The skills use only the read tools: `ynab_list_budgets`, `ynab_budget_summary`, and `ynab_get_transactions` (transaction reads, scoped by *one* optional `categoryId` / `accountId` / `payeeId` filter — this replaces the in-repo server we used to run). The server also registers write tools — `ynab_create_transaction`, `ynab_approve_transaction`, `ynab_bulk_approve_transactions`, `ynab_update_transaction`, `ynab_delete_transaction`, `ynab_import_transactions`, `ynab_update_category_budget`, plus list/update/delete tools for accounts, categories, payees, months, and scheduled transactions. No skill calls these; only creating *unapproved* transactions is sanctioned (see Conventions).
2. **`wave`** (in-repo, `mcp-servers/wave/index.mjs`) — a hand-rolled **read-only** stdio server over Wave's public GraphQL API (`gql.waveapps.com/graphql/public`), for your Wave business books. No deps (global `fetch`). Reads a Wave **full access token** from `WAVE_FULL_ACCESS_TOKEN` and an optional default business id from `WAVE_BUSINESS_ID`. Read-only by construction: the `graphql` tool **rejects any `mutation`**, so it can never write to the books.
   - Tools: `list_businesses`, `graphql` (read-only query passthrough — introspect the schema with a `__schema` query to discover fields).
3. **`snaptrade`** (hosted, [`https://mcp.snaptrade.com/mcp`](https://docs.snaptrade.com/docs/mcp-server)) — SnapTrade's official **read-only** MCP server over connected brokerage accounts (Fidelity). Streamable HTTP transport, authenticated with OAuth 2.0 + PKCE — no local code, no API keys, no env vars. Read-only by design: it reads balances, positions, orders, and activity and can generate a brokerage-connection link, but cannot place trades, move money, or change settings.
   - Tools (18, across four groups): connections (list brokerages and accounts), account information (balances, positions, orders, activity), reference data (currencies, exchange rates, security types), and connection helpers (generate a connect link).
   - **One-time setup** — the account owner authenticates, never the agent: reload Claude Code so the server registers, then run `/mcp`, pick `snaptrade`, and approve read-only access in the browser (OAuth registers the client automatically). Fidelity must be connected inside the SnapTrade account — use the connection-helper tool to generate a link if it isn't.

New MCP tools only appear after a Claude Code session reload.

## YNAB data surface (for skills)

What the tools actually return — the single source of truth the finance skills build on:

- **`ynab_budget_summary({ month, budgetId? })`** — `month` is `"current"` (default) or ISO `2026-06-01`; `budgetId` defaults to the budget set in `YNAB_BUDGET_ID`. Top-level keys are `monthBudget`, `accounts`, `note`. Returns:
  - `monthBudget` — `income`, `budgeted`, `activity`, `to_be_budgeted`, `age_of_money`, **and a nested `categories[]`** (see below). The categories live at **`monthBudget.categories`**, *not* at the top level.
  - `accounts[]` (top-level) — `name`, `type`, `on_budget`, `balance`, `cleared_balance`, `uncleared_balance`, and for debt accounts `debt_interest_rates` / `debt_minimum_payments` (month-keyed maps). **The tool already drops closed and deleted accounts**, so don't filter on a `closed` field — it's always false here. The flip side: a closed account that still holds a residual balance is silently omitted, so net worth from this tool can miss a real account — refresh those from the vault or the account portal.
    - Asset types: `checking`, `savings`, `cash`, `otherAsset`. Liability types (negative balance): `creditCard`, `lineOfCredit`, `mortgage`, `autoLoan`, `studentLoan`, `medicalDebt`, `otherLiability`, `otherDebt`. **Net worth = sum of all `balance`.**
  - `monthBudget.categories[]` — `id`, `name`, `category_group_name`, `budgeted`, `activity` (spend; negative = outflow), `balance`, `goal_target`, `hidden`, `deleted`. **Unlike `accounts[]`, this list is NOT filtered** — it includes hidden, deleted, and YNAB's internal categories (e.g. "Inflow: Ready to Assign"). Any skill that sums or iterates categories must first drop `hidden === true` and `deleted === true`, or category totals, overspent flags, and goal lists pick up phantom rows. The richer goal fields (`goal_percentage_complete`, `goal_overall_funded`, `goal_overall_left`, `goal_under_funded`, `goal_target_month`) appear only on categories that actually have a goal set — native YNAB behavior.
- **`ynab_get_transactions({ sinceDate?, categoryId?, accountId?, payeeId?, type?, limit?, budgetId? })`** — register transactions: `id`, `date`, `amount`, `payee_name`, `category_name`, `memo`, `account_name`, `approved`, `cleared`. The `categoryId` / `accountId` / `payeeId` filters are **mutually exclusive** — the tool applies them in that precedence (account, then category, then payee) and silently ignores the rest, so pass at most one; passing none returns the whole budget. Rules:
  - **Always pass a large `limit`** (e.g. `limit: 100000`). The default is **100**, results are **ascending by date (oldest first)**, and the tool slices to `limit` — so a missing/low limit silently returns the *oldest* 100 rows and drops everything newer. The result includes `total_available`; if `transaction_count < total_available` you truncated.
  - **`sinceDate` has no default.** Omit it and you get the category's or budget's *entire* multi-year history; pass an ISO `sinceDate` whenever you want a bounded window (e.g. the last 12–18 months for a spending or subscription review).
  - **Check for failure before reading the result.** On any error (bad token, rate limit, unknown id) the tool does not throw — it returns `{ success: false, error }` with **no `transactions` array**. Confirm `transactions` is present before treating an empty result as "none found," or a failed read silently reads as $0 spent / $0 paid.
  - **No cleared/approved filter by default.** With `type` omitted the tool returns *all* register rows, including uncleared and unapproved ones — "posted" overstates it. When a total must mean money that actually settled (estimated-tax payments, donations), filter on `cleared === "cleared"` / `approved === true` yourself.
  - **`amount` is a string in dollars** (e.g. `"-3760.14"`), already divided by 1000 — coerce it (`Number(amount)`) before any math; do **not** divide by 1000. Negative = outflow.
  - **Results are oldest-first**, not newest-first — sort by `date` descending client-side if you need recent-first. YNAB has no server-side text search, so filter the returned rows yourself (by payee/memo/category) for keyword lookups.
- **Milliunits vs. dollars:** every amount from `ynab_budget_summary` is in milliunits — **divide by 1000** for dollars. `ynab_get_transactions` `amount` values are strings already in dollars — coerce to number, never divide.

## Google Workspace (optional)

Some skills can pull supporting documents from Google Workspace (Drive, Gmail, Calendar). If you use them, prefer a CLI authenticated as the account that owns your data over the generic MCP connectors — the connectors often authenticate as a different account and silently return the wrong files. The `gws-*` skills wrap a `gws` CLI for this purpose; configure the account and any folder IDs locally (in `~/.claude.json` or env vars), never in this repo.

## Skills and calculations — don't compute from memory

- **For any tax, accounting, or financial calculation, load the authoritative skill first — never compute rates, brackets, thresholds, or penalties from memory.** A "conservative shortcut" presented as a number is an error, not an estimate. (Capital gains, for example, run a bracket stack with a 0% band — a flat 15% assumption overstates the tax.)
- **Front doors, in order:**
  - **OpenAccountants MCP** — call `mcp__openaccountants__start` first to scope by intent + jurisdiction, then `get_skill` each returned slug. Obey its guardrails (use only the skill's rates; flag Classified vs. Assumed vs. Needs-Input).
  - **Local finance skills** (`.claude/skills/`): `net-worth`, `spending-review`, `state-tax-estimator`, `tax-penalty-calc`, `emergency-fund`, `subscription-audit`, `debt-payoff`, `zero-based-budget`, and others. They wrap the YNAB tools — use them instead of re-deriving.
- **Skills carry the year they were written.** Verify every current-year figure (contribution caps, bracket breakpoints, standard deduction, wage bases, foreign-country rules) against a current authoritative source before relying on it.
- **Show the arithmetic and recompute.** Print the steps rather than asserting a total, and label a genuine computation vs. an assumption-driven default vs. a needs-user-input gap.
- **For high-stakes plans (a tax strategy, a large allocation), run an adversarial review** — fan out per-dimension reviewers, each loading the relevant skill, then verify each material finding before trusting it.

## Browser and app inspection

Read the page, don't photograph it. Image screenshots cost far more tokens than text, so inspect a browser or app through its text or accessibility layer first: Chrome via `get_page_text` or `read_page`, Preview via `preview_snapshot`, Maestro via `inspect_screen`. Take a screenshot only when a visual is the only way to answer, for example when the rendered layout or an image itself is the question and no text extraction can supply it.

## Writing conventions

- **Sentence case** for all filenames and headings — capitalize only the first word and proper nouns. Applies to Markdown headings and any doc this repo produces. Proper nouns (people, brands, institutions — "Fidelity", "State Farm", "YNAB") keep their casing.
- **Always use the `writing-clearly-and-concisely` skill when writing prose** — note bodies, summaries, reports, docs, commit messages, and any human-readable text. Apply it before finalizing the writing, not as an afterthought.
- **Never use em dashes (`—`).** This applies to every output this project produces: note bodies, outreach messages, summaries, reports, docs, commit messages, and chat replies. Use a comma, colon, parentheses, or a separate sentence instead; for numeric ranges use "to" or a hyphen.
- **Cite a clickable Gmail link inline whenever you reference an email** (in vault notes, summaries, and chat replies). Use Gmail's own permalink, which looks like `https://mail.google.com/mail/u/0/#all/<permalinkId>` where `<permalinkId>` is an opaque string Gmail assigns (e.g. `KtbxLz...`, `CXKn...`, `QgrcJ...`). The gws/Gmail API does **not** expose this id; it returns only a hex `id` (e.g. `19f0f431e4076a3c`). The hex id works as a legacy URL alias in a warm Gmail tab but fails on a cold click, so do not ship hex-id links. To get the real permalink, open the message once in the connected browser (`https://mail.google.com/mail/u/0/#all/<hexId>` resolves it) and copy the rewritten address-bar URL. Link the specific reply that carries the fact, not just the thread. Personal Gmail is `you@example.com` at index `/u/0/`.

## Conventions

- Do not mutate the budget. Creating *unapproved* transactions, categorizing, and summarizing is fine; **approving, updating, deleting, importing, and bulk-approving transactions, and editing category budgets, are not** — even though the upstream server now registers tools for all of them (`ynab_approve_transaction`, `ynab_bulk_approve_transactions`, `ynab_update_transaction`, `ynab_delete_transaction`, `ynab_import_transactions`, `ynab_update_category_budget`). Leave every write beyond create-unapproved to the account owner.
