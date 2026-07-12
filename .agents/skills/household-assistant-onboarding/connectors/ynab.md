# YNAB

Goal: `ynab_list_budgets` responds and `YNAB_BUDGET_ID` names the user's default budget.

1. **Mint the token.** Send the user to <https://app.ynab.com/settings/developer> (Personal Access Tokens, then New Token). Remind them: the token goes into a file, never into chat.
2. **Scaffold the slot.** Merge into `.claude/settings.local.json` (create it if absent; preserve existing keys; keep the JSON valid):

   ```json
   { "env": { "YNAB_API_TOKEN": "" } }
   ```

   Tell the user the exact file path and key to paste the token into. Alternative: export the variable in the shell they launch Claude Code from.
3. **Reload wall.** "Reload Claude Code, then say 'continue onboarding'."
4. **Verify.** Call `ynab_list_budgets`. If it fails while the env var is set, the token value is wrong: ask the user to re-check what they pasted.
5. **Pick the default budget.** Present the returned budget names and ask which one is the default. Write the chosen id into the same `env` block as `YNAB_BUDGET_ID` (an id, not a secret, so the skill writes it). It takes effect on the next reload; no need to reload now, since every YNAB tool accepts an explicit `budgetId`.
6. **Confirm with real data.** Call `ynab_budget_summary` with the chosen `budgetId` and show the account count, so the user sees data flow end to end.
