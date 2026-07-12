# gws CLI

Goal: `gws auth status` reports the account the user intends. This gates every `gws-*` skill and inbox triage.

1. **Install the binary.** If `command -v gws` fails, follow the install instructions at <https://github.com/googleworkspace/cli>. A non-interactive package install may run with the user's permission.
2. **Authenticate.** Instruct the user to run `gws auth login` in their own terminal; it is an interactive OAuth flow the agent does not drive. They should sign in as the account that owns the mailbox and Drive files the assistant will read.
3. **Verify.** Run `gws auth status` and confirm the reported account with the user. Wrong account: have them run `gws auth login` again with the right one. The generic Gmail MCP connectors are not a substitute here; in this project they can authenticate as a different account and silently return the wrong mailbox.
