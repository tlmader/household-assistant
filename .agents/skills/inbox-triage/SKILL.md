---
name: inbox-triage
description: >
  Triage the Gmail inbox of you@example.com: classify every thread into
  Action / Record / FYI / Noise / Unsure, flag action items for you to act on,
  update the personal-finance vault, and archive the rest. Use for
  "triage my inbox", "clear my inbox", or a scheduled inbox-triage run.
---

# Inbox triage

## Overview

Triages the Gmail inbox of **you@example.com** using the `gws` CLI, not the
Gmail MCP connector (that connector authenticates as a different account in
this project and silently returns the wrong mailbox). Run on demand. Only
wrap this in a scheduled routine after a few supervised runs confirm its
judgment.

The inbox itself is the work queue. There is no separate timestamp state:
every run lists whatever is currently in INBOX and classifies it.

Read `../gws-shared/SKILL.md` first for auth and global-flag conventions, and
`../gws-gmail/SKILL.md` for the underlying command reference.

## One-time setup

**Labels.** `Triaged/Action` and `Triaged/Archived` must exist. Create them
yourself on the first run if missing (label creation needs no extra scope).
Check once per session, before the first pipeline run.

## Pipeline (per run)

### 1. List inbox threads

```bash
gws gmail users threads list --params '{"userId":"me","labelIds":["INBOX"],"maxResults":500}'
```

Paginate with `pageToken` if `nextPageToken` is present. This returns thread
ids and snippets only, enough for a first pass, but pull full headers next.

### 2. Fetch each thread's classification context

```bash
gws gmail users threads get --params '{"userId":"me","id":"<THREAD_ID>","format":"metadata","metadataHeaders":["From","Subject","Message-ID","Date"]}'
```

`format: metadata` is enough (headers + snippet, no full body fetch) for
classification in the large majority of cases. Fall back to `format: full`
only when the snippet and subject genuinely leave the bucket ambiguous.

**Idempotency check before classifying:** if the thread already carries
`Triaged/Action`, skip it unless it also carries `UNREAD`. An unread
message on an already-flagged thread means a new reply arrived, so re-open it
for triage. Threads that already carry `Triaged/Archived` should not appear
in this list at all (archiving removes `INBOX`); if one does, treat it as a
bug, not a thread to classify.

### 3. Classify into exactly one primary bucket

| Bucket | Side effect | Inbox fate |
|---|---|---|
| Action needed | Flagged in summary; you create any task | Stays, labeled `Triaged/Action`, never auto-archived |
| Record | Vault note updated, or new entity proposed in summary | Archived |
| FYI | Summary line if time-sensitive | Stays while still time-relevant (ticket, upcoming event, recent personal note); archived once past |
| Noise | Counted | Archived |
| Unsure | Flagged in summary with best guess | Stays, unlabeled, re-judged next run |

Action may combine with Record on the same thread (flag the action, still
update the vault or propose the entity).

**Every thread from step 1 lands in exactly one primary bucket.** Before
applying any side effect, reconcile the classified count against the listed
count: they must match. A triage run that touches a subset of the inbox and
stops is the failure this guards against, so a partial pass never counts as a
finished inbox.

**Low confidence means Unsure, not a guessed bucket.** Nothing archives on a
guess: an Unsure thread never gets `Triaged/Archived`. This is the safety
valve against false negatives, i.e. important mail auto-archived. It is a
deliberate design choice, confirmed with the user, not something to
"improve" by forcing a bucket.

**Hard keep: never auto-archive a starred thread.** A star (the `STARRED`
label) is an explicit keep signal from the user; leave it in the inbox
whatever else it looks like.

**Archive versus keep turns on whether the mail still needs you, not on who
sent it.** Routine automated notifications are records: note what matters,
then archive, even when the sender is a bank or the subject sounds urgent.
- **Archive** (Record, or Noise when there is nothing to record): bank, card,
  and brokerage statements; payment receipts and order or purchase
  confirmations; scheduled transfer, withdrawal, and deposit notices; balance,
  credit-score, and account-status alerts; mass legal or policy notices
  (terms-of-service, privacy-policy, and service-update blasts).
- **Keep in the inbox:** anything you must act on or use soon (event tickets
  and passes, boarding or reservation documents, coursework and homework,
  appointments to attend) and personal mail from a real individual. Route
  these to Action if they need a discrete task, otherwise treat them as
  time-relevant FYI that stays until it is past. A financial sender never
  forces an archive, and needing your attendance or action always forces a
  keep.

Worked example from live feedback: an Eventpop **order confirmation** archives,
but the Eventpop **e-ticket** for the same event stays, because you need the
ticket to attend. Bank, card, and brokerage statements, a scheduled-withdrawal
notice, and a "your credit score changed" alert all archive; a class-homework
email and a personal thread stay.

### 4. Apply side effects

**Action needed: flag it, never create a task.** Do not write to Google Tasks;
the routine surfaces the action and the user decides whether to task it.

- Label the thread `Triaged/Action` (see step 5) and leave it in the inbox.
- In the summary, give a verb-first line stating the ask, plus the sender, one
  line of context, and the email link (format below). Note a deadline only
  when the email states a real one; never invent one.
- A `Triaged/Action` thread is never auto-archived, on this run or any later
  run.

**Record: update the vault.**

- Update existing entity notes autonomously: body, `as_of_date`, and source
  link. Follow the vault's existing conventions (sentence case, `owner` and
  `as_of_date` frontmatter fields; see `PERSONAL_VAULT_PATH`).
- **Never create a new entity note unilaterally.** If the thread implies an
  entity the vault doesn't have yet, propose it in the chat summary and wait
  for approval. This keeps the vault's one-note-per-entity curation intact.
- Then archive the thread (step 5).

**FYI / Noise: no side effect beyond the summary**, then archive (step 5).

**Unsure: no side effect.** Leave the thread in INBOX, unlabeled, with a
best-guess bucket noted for the summary. Do not archive.

### 5. Archive or label

The two mutating commands behind the fates in step 4. Before archiving any
thread, re-check the keep rules in step 3: a starred thread, or any thread
already carrying `Triaged/Action`, is never archived, even when its bucket
says Archived. Archiving is otherwise autonomous: no per-run confirmation.
Apply the audit label before removing `INBOX` so one Gmail search
(`label:Triaged/Archived`) recovers everything a run touched:

```bash
# Archive (Record / FYI / Noise)
gws gmail users threads modify --params '{"userId":"me","id":"<THREAD_ID>"}' --json '{
  "addLabelIds": ["Label_Triaged_Archived_ID"],
  "removeLabelIds": ["INBOX"]
}'

# Flag for action, keep in inbox, no task created (Action needed)
gws gmail users threads modify --params '{"userId":"me","id":"<THREAD_ID>"}' --json '{
  "addLabelIds": ["Label_Triaged_Action_ID"]
}'
```

Label ids come from `gws gmail users labels list`, not the label names
directly. Resolve them once per run and cache in memory for the rest of
the run. Match the exact full label name `Triaged/Action` and
`Triaged/Archived` (the `/` is Gmail's nesting). A standalone parent label
named `Triaged` also exists; do not match it by substring.

## Email link format

Use this form everywhere a thread is referenced: chat summaries and vault
notes.

```
https://mail.google.com/mail/u/0/#search/rfc822msgid:<Message-ID>
```

`<Message-ID>` is the raw `Message-ID` header value (including the angle
brackets, e.g. `<CAB...@mail.gmail.com>`), returned free by the
`threads.get`/`messages.get` headers. This link resolves on a cold click
with no live browser session required, unlike a Gmail permalink id.

This is a deliberate, scoped amendment to the project-wide Gmail-permalink
convention in `CLAUDE.md` (`#all/<permalinkId>`), which needs a live,
already-authenticated browser tab to resolve per message and is unworkable
for a headless routine. The amendment applies to this skill's output only;
other skills keep using the permalink form.

## Chat summary

Print in this order:

1. **Need to know:** each action item flagged (you create any task), with a
   verb-first ask, deadline if the email states one, and the email link.
2. **Records:** vault notes updated, plus proposed new entities awaiting
   approval.
3. **Unsure:** unclassifiable threads with the model's best guess.
4. **Counts:** one line: `N archived (X FYI, Y noise)`. Include per-thread
   FYI detail lines only when time-sensitive; otherwise the count line is
   enough. Action items flagged, records, unsure, and archived must sum to the
   step-1 thread count; if they don't, threads went untriaged, so finish them
   before printing.

## Backlog handling

The **first run** covers only the last 30 days (`after:` in the Gmail search,
or filter client-side on thread date). Report in the summary how many older
threads remain untouched. A deeper backfill is a deliberate, separate run
with an explicit older date window that the user asks for, never a surprise
side effect of the first run.

## Conventions that bind this skill

- **Sanctioned writes only.** Read-only toward every external system except
  two writes: apply or remove a Gmail label, and update an existing vault
  note. Do not create Google Tasks. Never approve, delete, or reply to email;
  never create a new vault entity note without approval.
- Generated output (flagged-action lines, vault text, chat summaries) follows
  the project prose rules in `CLAUDE.md`: no em dashes, sentence case, and the
  `writing-clearly-and-concisely` skill.
