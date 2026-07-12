# Personal data vault

Goal: `PERSONAL_VAULT_PATH` is set (where a local path exists), the vault folder exists, and `conventions.md` plus `index.md` sit at its root.

The vault is a folder of markdown notes, one structured note per entity: an account, loan, asset, insurance policy, subscription, tax filing, trip, or medical record. When configured, skills read the vault first for finance and records questions and refresh a note from its named source when it goes stale.

## 1. Hosting question

Ask: "Where should the vault live? Google Drive (shareable across people), Obsidian (local, single machine), or somewhere else?" Then follow the branch.

### Google Drive

Best when more than one person shares the assistant: each operator clones the repo, runs their own Claude Code, and reads and writes the same notes.

- **Create the folder.** The user creates a Drive folder for the vault (through the `gws-drive` skill if the gws probe is live, or at <https://drive.google.com>). For a shared household, they share it with the other operators now.
- **Access route.** Read and write notes through the gws CLI by default; it behaves the same on every operator's machine and is explicit about the account.
- **Optional local mirror.** Drive for Desktop can sync the folder to disk. On a streaming setup its files can be absent or dataless stubs, so treat the mirror as a per-machine convenience, not the source.
- **Concurrent edits.** Drive does not merge simultaneous edits to a plain file. With multiple operators, avoid editing the same note from two machines in one sync window, and sweep occasionally for `[Conflict]` copies (Drive expires them after about 30 days).
- **Env var.** With a local mirror, set `PERSONAL_VAULT_PATH` to the mirror path. Without one, skip the env var; the folder's `index.md` and the gws CLI carry discovery.

### Obsidian

Best for a single operator. An Obsidian vault is just a folder of markdown, so the user picks or creates one (and can open it in Obsidian for browsing and editing). Set `PERSONAL_VAULT_PATH` to that folder.

### Somewhere else

Any folder works: another sync tool, a NAS mount, a plain local directory outside this repo. Set `PERSONAL_VAULT_PATH` to it.

## 2. Scaffold

Copy the bundled templates to the vault root: [templates/conventions.md](../templates/conventions.md) and [templates/index.md](../templates/index.md). For a local folder, copy the files; for Drive without a mirror, upload them through gws. Invite the user to edit `conventions.md` as their rules take shape; it is theirs now, and it supersedes the template.

## 3. Write the env var

When a local path exists, write `PERSONAL_VAULT_PATH` into the `env` block of `.claude/settings.local.json` (a path, not a secret, so the skill writes it). The reload wall applies.

## 4. Verify and seed

Re-run the vault probe: env var (where expected), folder, both files. Then offer to draft the first note, for example a checking account, following the frontmatter in `conventions.md`, and add it to `index.md`.
