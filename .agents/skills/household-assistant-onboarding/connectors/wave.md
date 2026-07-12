# Wave

Goal: `list_businesses` responds.

The in-repo Wave server is read-only by construction; it rejects any GraphQL mutation.

1. **Mint the token.** The user creates a full access token in the Wave developer portal at <https://developer.waveapps.com> (manage applications, create token). It goes into a file, never into chat.
2. **Scaffold the slot.** Merge `"WAVE_FULL_ACCESS_TOKEN": ""` into the `env` block of `.claude/settings.local.json`, same rules as the YNAB step: create if absent, preserve existing keys, valid JSON, user pastes the value.
3. **Reload wall.** "Reload Claude Code, then say 'continue onboarding'."
4. **Verify.** Call `list_businesses`. A failure with the env var set means the token value is wrong.
5. **Pick the default business.** If more than one business returns, ask which is the default and write its id as `WAVE_BUSINESS_ID` (an id, not a secret). It takes effect on the next reload.
