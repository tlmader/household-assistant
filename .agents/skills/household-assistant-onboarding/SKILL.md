---
name: household-assistant-onboarding
description: "Set up or diagnose this household assistant's connectors: YNAB, Wave, SnapTrade, the gws CLI, OpenAccountants, the personal data vault, and inbox triage. Probes what already works and resumes at the first incomplete step; every integration is optional. Use when the user wants to get started ('set up my household assistant', 'onboard me', 'finish setup', 'continue onboarding'), asks for a health check ('check my setup', 'what is connected', 'is everything working'), or reports a connector broken ('YNAB is not working', 'gws will not authenticate')."
license: MIT
metadata:
  version: 1.0.0
---

# Household assistant onboarding

Guide the user from a fresh clone to a working assistant, or diagnose an existing setup. The skill is **stateless**: it keeps no progress file. Every run starts with the probe pass and resumes at the first incomplete step the user cares about. Re-running the skill is the health check.

## Ground rules

- **Everything is optional.** Any connector can be skipped. Recommend YNAB first (most finance skills run on it), but never block on it.
- **Secrets never pass through chat.** Say this out loud before the first token step: "Don't paste tokens here. I'll prepare the file; you paste the value into it." The skill writes only non-secrets (`YNAB_BUDGET_ID`, `WAVE_BUSINESS_ID`, `PERSONAL_VAULT_PATH`). Never print `settings.local.json` contents and never echo env var values; probe presence only (`[ -n "$VAR" ]`).
- **Instruct + probe.** The user drives every interactive auth flow (`/mcp`, `gws auth login`, token minting) in their own browser or terminal. The skill's job is to know what comes next and whether it worked. Non-interactive installs may run with the user's permission.
- **One question at a time.** Ask, wait, continue. Explain why you ask when it isn't obvious.
- **The reload wall.** MCP servers read env vars at session start, and new tools register only on reload. After any `settings.local.json` change, end the step with: "Reload Claude Code, then say 'continue onboarding'." The next run's probes pick up from there.

## Probe pass

Run these probes first, batching the shell probes into one Bash call. Never echo secret values.

| Component | Probe | Live when |
| --- | --- | --- |
| Prerequisites | `node --version`; `pnpm --version`; `test -f node_modules/ynab-mcp-server/dist/index.js` | Node >= 24, pnpm >= 10, `dist` built |
| YNAB | `$YNAB_API_TOKEN` set; `ynab_list_budgets` responds; `$YNAB_BUDGET_ID` set | budgets listed and a default budget chosen |
| Wave | `$WAVE_FULL_ACCESS_TOKEN` set; `list_businesses` responds | businesses listed |
| SnapTrade | snaptrade tools registered; `Connections_listBrokerageAuthorizations` responds | authorizations listed |
| gws CLI | `command -v gws`; `gws auth status` | authenticated |
| OpenAccountants | openaccountants tools registered; `start` responds | a plan returns |
| Vault | `$PERSONAL_VAULT_PATH` set; folder exists; `conventions.md` and `index.md` present | all three |
| Inbox triage | knowledge base files in `${INBOX_TRIAGE_WORKSPACE:-$HOME/.household-assistant/inbox-triage}/Email/` | the 7 KB files present |

Each row lands in one of four states; report which:

- **live**: the probe passed.
- **pending reload**: the env var is set but the MCP tool is missing. The config landed; the session hasn't reloaded.
- **broken**: the tool is registered but the call fails (bad, revoked, or misspelled token; wrong id).
- **not configured**: nothing set.

Then present a short status table and branch on how the user arrived:

- **Diagnostic entry** ("check my setup", "X isn't working"): explain each non-live state and what its failing probe means, offer the matching fix step, and stop unless the user takes it.
- **Onboarding entry**: ask which connector to set up next, recommending the first non-live row in table order.

## Prerequisites step

If Node or pnpm is missing or too old, point at <https://nodejs.org> and <https://pnpm.io> and wait. If `dist` is missing, run `pnpm install` (it builds the pinned YNAB server) and re-probe.

## Connector steps

Load the file for the connector the user picked and follow it end to end. Completion criterion for every connector: its probe row reads **live**.

- [connectors/ynab.md](connectors/ynab.md): token, reload, pick the default budget
- [connectors/wave.md](connectors/wave.md): token, reload, pick the default business
- [connectors/snaptrade.md](connectors/snaptrade.md): OAuth via `/mcp`, connect a brokerage
- [connectors/gws.md](connectors/gws.md): install and authenticate the gws CLI (gates inbox triage)
- [connectors/openaccountants.md](connectors/openaccountants.md): tax skills front door
- [connectors/vault.md](connectors/vault.md): hosting choice, scaffold conventions and index

## Inbox triage step

Prerequisite: the gws probe reads live. Offer: "Set up inbox triage now? It's an interview, about 15 minutes." On yes, invoke the `inbox-setup` skill, let it run to completion, then return here for the closing summary. On "later", list the resume phrase in the closing summary instead.

## Closing summary

End every run with three lists:

- **Live**: connectors whose probes pass now.
- **Pending reload**: steps that finish after "reload, then say 'continue onboarding'".
- **Skipped**: each with the exact phrase that resumes it, for example "set up Wave" or "set up inbox triage".
