# File structure

Layout reference for `household-assistant`.

```text
.agents/skills/<name>/       Canonical vendored skills (real directories, committed)
.claude/skills/<name>        Relative symlinks into .agents/skills/<name>
.claude/settings.json        Plugins + SessionStart worktree-setup hook
.codex/environments/         Codex worktree setup (mirrors the Claude hook)
.github/                     PR template, CODEOWNERS, workflows, actionlint config
.husky/                      commit-msg (commitlint) and pre-commit (lint-staged) hooks
mcp-servers/wave/            In-repo read-only Wave GraphQL MCP server
scripts/                     clean.sh, worktree-setup.sh
.mcp.json                    Project-scoped MCP server registration (env-var secrets)
skills-lock.json             Source + path + hash for every vendored skill
pnpm-workspace.yaml          onlyBuiltDependencies allowlist for the git-pinned ynab-mcp-server
AGENTS.md                    Shared workflow contract (structure, commands, conventions)
CLAUDE.md                    Agent operating instructions; imports AGENTS.md
```

Skills live in two places by design: `.agents/skills/` holds the real files; `.claude/skills/` holds only symlinks so Claude Code discovers them. Add a skill under `.agents/skills/<name>/`, then `ln -s ../../.agents/skills/<name> .claude/skills/<name>`.
