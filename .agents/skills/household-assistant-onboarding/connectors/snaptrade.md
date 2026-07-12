# SnapTrade

Goal: `Connections_listBrokerageAuthorizations` responds.

SnapTrade is hosted, read-only, and authenticated over OAuth: no tokens land in any config file. The account owner authenticates, never the agent.

1. **Authorize the server.** Instruct the user: run `/mcp` in an interactive Claude Code session, pick `snaptrade`, and approve read-only access in the browser. OAuth registers the client automatically.
2. **Reload if needed.** If the snaptrade tools still don't appear afterward, reload Claude Code.
3. **Verify.** Call `Connections_listBrokerageAuthorizations`.
4. **Connect a brokerage.** If the list is empty, no brokerage is linked yet. Call `request_connection_link`, hand the user the link, and let them connect their brokerage (for example Fidelity) in the browser. Re-probe when they say it's done.
