# OpenAccountants

Goal: the OpenAccountants `start` tool responds.

CLAUDE.md routes every tax and accounting calculation through the OpenAccountants MCP first. Without it, the bundled tax skills fall back on figures frozen at the year they were written.

1. **Install.** Follow the provider's MCP setup instructions at <https://www.openaccountants.com>. Add the server at the user level (for example with `claude mcp add`), not to this repo's committed `.mcp.json`.
2. **Reload wall.** "Reload Claude Code, then say 'continue onboarding'."
3. **Verify.** Call `start` with a small scoping intent (for example "US federal income tax overview") and confirm it returns a plan of skills.
