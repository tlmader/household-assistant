# Repository guidelines

## Project structure

This repository configures a Claude Code household finance assistant: vendored agent skills, two local MCP servers, and the agent instructions that bind them to YNAB, Wave, SnapTrade, and Google Workspace.

- `.agents/skills/<name>/`: canonical committed skills, vendored from upstream sources tracked in `skills-lock.json`
- `.claude/skills/<name>`: relative symlinks (`../../.agents/skills/<name>`) where Claude Code discovers skills; every entry is a symlink, never a real directory
- `mcp-servers/wave/`: in-repo read-only Wave GraphQL MCP server
- `.mcp.json`: project-scoped MCP server registration (env-var secrets only)
- `CLAUDE.md`: agent operating instructions; imports this file
- `docs/`: contributor references such as `docs/file-structure.md`
- root config: `package.json`, `commitlint.config.js`, `commitizen.config.json`, `.husky/`, `pnpm-workspace.yaml`

Use GitHub issues as the durable design record. Do not commit design or plan artifacts for routine issue work; put durable context on the issue, or in normal docs when it is useful beyond one issue.

## Commands

- `pnpm install` (alias `pnpm env:setup`): install dev tooling and initialize husky. It does not restore skills; vendored skills are committed.
- `pnpm skills:install`: re-vendor locked skills from `skills-lock.json` via the upstream skills CLI, then commit the refreshed overlays. Manual maintenance command, not an install hook.
- `pnpm clean`: remove `node_modules` and transient install files; never prunes committed skill overlays.
- `bash scripts/worktree-setup.sh`: shared worktree bootstrap (fast-forward onto `origin/main`, then `pnpm env:setup`); wired into the Claude `SessionStart` hook and the Codex `[setup]` block.
- `pnpm commit`: guided conventional commit with issue tagging.
- `pnpm lint:md`: lint tracked Markdown (vendored skill directories are excluded).

## Commit and pull request guidelines

Commits use conventional commit types, no scopes, and a required GitHub issue tag, with the subject capped at 72 characters:

`type: #123 short description`

Examples:

- `feat: #12 add subscription audit skill`
- `docs: #17 clarify SnapTrade setup`

Start the description with a lowercase word; keep proper nouns capitalized (`YNAB`, `SnapTrade`, `Patina`, `AGENTS.md`). commitlint leaves subject case unenforced precisely so proper nouns are allowed, so this is a convention the hook does not check.

PR titles use the same format so squash commits reuse them verbatim. Fill in `.github/pull_request_template.md` as written: a closing keyword (`Closes #<issue>`) is required, `What changed` states each change and why, and `Testing steps` appears only for human-owned behavior or artifact checks. GitHub Checks are the source of truth for routine automated verification; do not paste passing command output into PR bodies.

Issue titles stay plain-language, with no commit-style prefix.

### Commit type selection

Product surfaces first: `.agents/skills/**`, `.claude/skills/*`, `mcp-servers/**`, and `.mcp.json` are this repo's product; everything else is tooling or docs. Pick the type from the path the change touches, then adjust only if the intent differs.

| Path touched | Default type |
|---|---|
| `.agents/skills/**`, `.claude/skills/*` (new or changed capability) | `feat` |
| `.agents/skills/**` (wrong behavior corrected) | `fix` |
| `mcp-servers/**`, `.mcp.json` | `feat` or `fix` by intent |
| `skills-lock.json` re-vendor | `chore` |
| `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/**`, `CONTRIBUTING.md`, `SECURITY.md` | `docs` |
| `.github/workflows/**`, `.github/actionlint.yaml` | `ci` |
| `package.json`, `.husky/**`, lint configs, `scripts/**` | `chore` |

Rationalizations to reject:

| Excuse | Reality |
|---|---|
| "It adds value, so it is `feat`" | Value is not surface. A README improvement is `docs`. |
| "It changes behavior, so it is `fix`" | Tooling behavior is `chore` or `ci`; `fix` corrects a wrong product behavior. |
| "Most lines are docs, so `docs`" | Line counts do not decide. If a skill's behavior changed, it is `feat` or `fix` even when prose dominates. |

STOP and re-derive the type when any of these red flags appear:

- You chose the type before looking at the paths in the diff.
- The subject describes the motivation, not the change.
- One commit spans product and tooling surfaces; split it instead.

Wrong versus right:

- WRONG: `feat: #9 improve contributing guide` (touches only `CONTRIBUTING.md`)
- RIGHT: `docs: #9 improve contributing guide`

## Testing guidelines

Tests must not assert on the prose content of documentation files. Tests validate code behavior and machine-consumed contracts only: shell/JS behavior, valid JSON/YAML config, `.md` frontmatter schema, symlink resolution, and required-file existence. A documentation file's prose body must stay freely editable without breaking a test. Markdown linting (`pnpm lint:md`) is unaffected; linting is not testing.

## Issue and PR labels

Use `gh label list` to see the repository's canonical label set; each label's description documents when to apply it. Do not invent new labels without updating the label set first.

## GitHub Actions pinning

Pin every action reference to a full 40-character commit SHA, not a tag. Above each `uses:` line, leave a comment naming the action and version the SHA corresponds to:

```yaml
# actions/checkout@v4.3.1
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
```

`actionlint` runs in CI on `.github/workflows/**` changes.

## Repository hygiene

This repo is public. Never commit real personal or household values in file content; see `CLAUDE.md` for the full banned-values list and the gitleaks scan (pre-commit hook and CI) that enforces it. Commits are authored under the maintainer's identity and SSH-signed, so the author name in `LICENSE` and `package.json` is intentional and allowlisted; that is content, not a reason to relax the household denylist elsewhere.
