# Vault conventions

One note per entity: an account, loan, asset, insurance policy, subscription, tax filing, trip, or medical record. Notes are markdown with YAML frontmatter; the body carries history, context, and source links.

## Frontmatter

```yaml
---
title: Example checking account
type: account          # account | loan | asset | policy | subscription | tax-filing | trip | medical | other
as_of_date: 2026-01-01 # when the facts were last confirmed
source: Bank portal    # where to refresh from: a portal name or a document link
source_doc_ref:        # optional link to the source document (for example a Drive file)
---
```

## Rules

- Give every note an `as_of_date`, and refresh from the named `source` when the note is stale.
- When a fact comes from a document, link the document itself, never a bare file id.
- Keep one folder per domain (`Accounts/`, `Insurance/`, `Taxes/`, ...) and co-locate notes beside the documents they digest.
- `index.md` lists every note by path. Any session that creates, moves, or deletes a note updates `index.md` in the same session.
- This file is the vault's source of truth for structure and style. Edit it as your rules evolve; assistants read it first, every session.
