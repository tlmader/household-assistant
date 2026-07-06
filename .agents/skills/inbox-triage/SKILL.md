---
name: inbox-triage
description: "Runs a full triage of a configured Gmail inbox using the knowledge base built by the 'inbox-setup' skill. Light-intake by design (most invocations skip questions and run with KB-default preferences); asks at most 2 grill-me override questions when the invocation is outside normal cadence or includes category-skip intent. Searches recent emails via the gws CLI, classifies them by the user's taxonomy, researches new senders, generates recommendations, drafts replies (NEVER sends), delivers a report in the user's preferred format, and updates the knowledge base with learnings. Designed to run on a recurring schedule (1-3x daily) or on demand. Use for 'triage my inbox', 'inbox triage', 'check my email', 'run email triage', 'process my inbox', 'clear my inbox', or a scheduled inbox-triage run. Requires the inbox-setup skill to have been run first."
license: MIT
metadata:
  source: "Ported from alirezarezvani/claude-skills productivity/email/skills/inbox-triage (MIT). Gmail access adapted from Gmail MCP to the gws CLI for this project."
  build_pattern: "Path B (direct conversion), gws-adapted"
  paired_with: "inbox-setup (consumes the 7-file KB it produces)"
  version: 1.0.0
---

# Inbox-triage: recurring email triage

> **Paired with `inbox-setup`.** This skill consumes the 7-file knowledge base that `inbox-setup` writes at `${INBOX_TRIAGE_WORKSPACE}/Email/`. The file contracts MUST match exactly. See [`references/kb_file_contract.md`](references/kb_file_contract.md), the mirror of the setup-side contract viewed from the read side.

Run on a recurring schedule (1-3x daily) or on demand. Classify recent emails, research new senders, generate decision recommendations, draft replies (**NEVER SEND**), deliver a clean report, and update the knowledge base with what was learned this run.

## Gmail access: gws CLI, not the Gmail MCP connector

This skill reads and writes your Gmail mailbox (the account the **`gws` CLI** is authenticated as) through `gws`, not the Gmail MCP connector. The connector may authenticate as a different account and silently return the wrong mailbox. Read `../gws-shared/SKILL.md` first for auth and global-flag conventions, and `../gws-gmail/SKILL.md` for the command reference. The default account is at index `/u/0/`.

The upstream skill was provider-agnostic (Gmail / Outlook / IMAP MCP). This port fixes the provider to Gmail via `gws`. If you ever need another provider, add an adapter; do not fall back to the Gmail MCP connector here.

## Workspace and knowledge base location

The knowledge base holds personal preferences (voice, blocklist, trackers) and must **not** be committed to this repository. It lives at `${INBOX_TRIAGE_WORKSPACE}/Email/`, where `INBOX_TRIAGE_WORKSPACE` is set in `~/.claude.json` (never committed), the same pattern this project uses for `PERSONAL_VAULT_PATH`. If the variable is unset, default to `~/.household-assistant/inbox-triage`.

## Invocation triggers

- "triage my inbox"
- "inbox triage"
- "check my email"
- "run email triage"
- "process my inbox"
- "clear my inbox"
- "what's new in my email"
- "handle my email"
- "email triage"

## Prerequisites

Required reads at start (fail-fast if missing):

**Core (required):**
- `${INBOX_TRIAGE_WORKSPACE}/Email/email-taxonomy.md`: classification + report preferences
- `${INBOX_TRIAGE_WORKSPACE}/Email/email-patterns.md`: voice, persona, templates, hard rules

**Optional core (read if it exists):**
- `${INBOX_TRIAGE_WORKSPACE}/Email/evaluation-framework.md`
- `${INBOX_TRIAGE_WORKSPACE}/Email/rate-card.md`

**Evolving (read AND update every run):**
- `${INBOX_TRIAGE_WORKSPACE}/Email/blocklist.md`
- `${INBOX_TRIAGE_WORKSPACE}/Email/tracker.md`

**Output:**
- `${INBOX_TRIAGE_WORKSPACE}/Email/triage-log/<YYYY-MM-DD>-<run-label>.md`: per-run log

If any core required file is missing, **halt** and direct the user to run `inbox-setup` first. Use `scripts/kb_reader.py --workspace ${INBOX_TRIAGE_WORKSPACE}` to perform the read + validation.

## DRAFTS ONLY: never send

> **This skill creates drafts. It NEVER sends.**

This is the safety property that makes the skill safe to run automatically. It is stated multiple times in this skill body. Non-negotiable.

Draft creation uses `gws gmail users drafts create`. **Never** call `gws gmail users drafts send`, `gws gmail users messages send`, or any other send-shaped operation. `scripts/draft_safety_validator.py` enforces this post-run: any send-shaped tool call in the action log fails validation. See [`references/drafts_only_safety.md`](references/drafts_only_safety.md) for the full discipline canon.

## Step 0: grill-me intake (light, 0-2 optional override questions)

Inbox-triage is **light-intake by design**. It runs on a recurring cadence with preferences pre-baked into the knowledge base from `inbox-setup`. The grill-me discipline here is asking ONLY the override questions that matter THIS run.

### Q1 (optional, asked only when an on-demand run is outside normal cadence)

> **Override the default 9-hour search window? Pick: yes (specify hours) / no (use default).**
>
> *Why I'm asking:* If you're running on-demand outside your normal 2x/day cadence, you may want a wider window (24h after a long break) or narrower (2h for a quick check).

Skip if cadence is normal.

### Q2 (optional, asked only when the user invokes with category-skip intent)

> **Skip any categories this run? For example "skip newsletters", "skip financial".**
>
> *Why I'm asking:* Sometimes you just want to scan opportunities or clear active threads. A category skip narrows the run scope.

Skip if the user gave no category-skip signal.

**Stop condition:** max 2 questions. Default invocations skip both and run with KB-default preferences. The skill is optimized for fast recurring execution; intake is the exception, not the norm.

## Step 1: determine search window

Compute via current-date math. Default lookback: **9 hours** (works for a 2x/day cadence with slight overlap so emails between runs aren't missed).

Use `scripts/search_window_calculator.py --cadence <CADENCE> --now <ISO>`:

```
now = current_datetime
window_start = now - 9_hours   (default for 2x-daily)
run_label = "Morning" if now.hour < 12 else "Afternoon" if now.hour < 17 else "Evening"
```

Cadence-to-default-window mapping (override via Q1):

| Cadence (from email-taxonomy.md S1.Q5) | Default window |
|---|---|
| once daily | 26h |
| 2x daily | 9h |
| 3x daily | 6h |
| on-demand only | 24h (asks Q1) |

## Step 2: email search (gws CLI)

Two queries against the mailbox:

- **Primary:** inbox + sent after `window_start`
- **Secondary:** starred unread (catches flagged items missed in the primary query)

```bash
# Primary: threads in the inbox within the window
gws gmail users threads list --params '{"userId":"me","q":"in:inbox after:<YYYY/MM/DD>","maxResults":500}'

# Sent within the window (to detect threads you already replied to)
gws gmail users threads list --params '{"userId":"me","q":"in:sent after:<YYYY/MM/DD>","maxResults":500}'

# Secondary: starred unread, any age
gws gmail users threads list --params '{"userId":"me","q":"is:starred is:unread","maxResults":200}'
```

Gmail's `after:` takes `YYYY/MM/DD` or a Unix timestamp; `search_window_calculator.py` prints both. Paginate with `pageToken` (or the `--page-all` global flag) when `nextPageToken` is present.

For each candidate thread, fetch classification context:

```bash
gws gmail users threads get --params '{"userId":"me","id":"<THREAD_ID>","format":"metadata","metadataHeaders":["From","Subject","Message-ID","Date"]}'
```

`format: metadata` (headers + snippet, no full body fetch) is enough for classification in the large majority of cases. Fall back to `format: full` only when the snippet and subject genuinely leave the bucket ambiguous. Collect for each email: sender, subject, date, snippet, thread ID, `Message-ID`, labels.

If no email tool is registered for the session, halt with a clear message: "No gws Gmail access available for this session."

## Step 3: classification

Apply the taxonomy from `email-taxonomy.md`. For the **lowest-priority** category (newsletters / automation / spam), skip thread reads entirely: the context cost is not worth it. For everything else, read the full thread when the metadata pass is ambiguous.

## Step 4: sender research

For senders not in the tracker, blocklist, or prior logs:

1. Check `blocklist.md`. If matched, auto-skip.
2. Check `tracker.md`. If it is a known thread, note the existing context.
3. For opportunity senders (per the evaluation framework), web-search for company legitimacy, social presence, and intermediary status.

**Skip research entirely** for known senders (in tracker), internal email, automated notifications, and obvious low-priority mail.

## Step 5: recommendations

For decision-required emails, apply the framework from `evaluation-framework.md`. Categorize:

| Category | When | Output |
|---|---|---|
| **TAKE IT** | Meets criteria | Recommend engaging; draft reply (Step 6) |
| **WORTH CONSIDERING** | Has potential, needs user judgment | Surface key context; draft for user to edit |
| **PASS** | Doesn't meet criteria | Brief "why" (1-3 sentences); draft polite decline |
| **FLAG FOR REVIEW** | Unusual; needs a direct user decision | Surface fully; NO draft (user decides the response shape) |

Each: brief "why", relevant context, pricing/timeline comparison if applicable.

**Skip Step 5 entirely if no `evaluation-framework.md` exists.**

See [`references/triage_decision_framework.md`](references/triage_decision_framework.md) for the framework canon.

## Step 6: drafts (gws CLI, never send)

For every reasonable reply candidate, create a draft using `email-patterns.md` voice rules.

**Draft for:** opportunity responses (TAKE IT / WORTH / PASS), active conversations needing a reply, action items, important personal emails.

**Do NOT draft for:**
- Clearly no-response emails (newsletters, automation, FYI)
- Threads where the user already replied
- Blocked senders (unless new information changes the calculus)

**Mechanics:**

Build the reply as an RFC 822 message, base64url-encode it, and attach it to the existing thread via `threadId` so context is preserved:

```bash
gws gmail users drafts create --params '{"userId":"me"}' --json '{
  "message": {
    "threadId": "<THREAD_ID>",
    "raw": "<BASE64URL_RFC822>"
  }
}'
```

The raw message sets `To`, `Subject` (`Re: [original]`), and `In-Reply-To` / `References` to the original `Message-ID` for correct threading. Inspect the schema first with `gws schema gmail.users.drafts.create`.

- **NEVER call `gws gmail users drafts send`, `gws gmail users messages send`, or any send verb. Only create drafts.**

The draft body MUST honor:
- Voice register from `email-patterns.md`
- Forbidden tokens (S3.Q2 pet peeves)
- Sign-off patterns
- Persona context
- Hard rules (S3.Q6, non-negotiable)
- Reply length per `email-patterns.md`

If `evaluation-framework.md` exists, the draft tone matches the recommendation:
- TAKE IT: engaged + concrete next step
- WORTH: curious + 1-2 clarifying questions
- PASS: polite decline + brief reason (no hedging promises)
- FLAG: NO draft

## Step 7: report delivery

Honor the user's preference from the `email-taxonomy.md` "Report Preferences" section. Default: an email draft to self (created with `gws gmail users drafts create`, HTML body), or a chat summary when that is the configured format.

**Subject:** `Inbox triage: [Day], [Month Date] ([Run Label])`

**Sections (in order):**

1. **Overview:** 2-3 sentences. What happened? Anything urgent?
2. **Stats:** counts of processed, drafts created, action needed, skipped.
3. **Action needed:** overdue items, decisions, drafts to review, deadlines.
4. **Quick reference:** one line per email, alphabetical by sender. `**Sender**: one-sentence summary + recommendation`.
5. **Detailed cards:** opportunities, active threads, flags. Each: sender / subject / category, recommendation + reasoning, key context. **NO draft text previews** (the drafts are already in the Gmail client for the user to read there).
6. **Footer:** generation timestamp + KB update summary.

Reference every email with a cold-resolvable link (see "Email link format" below).

**Formatting (if HTML):**

- **Inline CSS only** (Gmail strips `<style>`)
- Color-coded by recommendation:
  - green: TAKE IT
  - amber: WORTH CONSIDERING
  - red: PASS
  - purple: FLAG FOR REVIEW
  - blue: active conversation

## Step 8: knowledge base update

**`blocklist.md`** (append new):

- New declined senders + reason + date
- New decline patterns from observed behavior (for example, "all emails containing 'looking for backend engineers' from gmail addresses becomes a cold-recruiter pattern")
- Remove entries if the user has overridden them (user replied to a "blocked" sender, so unblock)

**`tracker.md`** (append + update):

- New follow-ups for emails needing future action
- Update existing follow-ups (deadline changed, status changed)
- Mark resolved items complete
- Flag overdue items
- Remove resolved items older than 30 days
- Add an entry to the update log

**Learning patterns to observe over runs:**

- Drafts sent as-is vs. edited vs. deleted: tone-calibration signal
- PASS recommendations the user overrides: framework-adjustment signal
- Engaged vs. ignored emails: taxonomy-refinement signal
- New decline patterns: blocklist additions

After 5+ runs, suggest KB improvements to the user (for example, "You always decline emails from X. Add as auto-skip?").

## Step 9: internal log

Save to `${INBOX_TRIAGE_WORKSPACE}/Email/triage-log/<YYYY-MM-DD>-<run-label>.md`:

- Emails processed with classifications
- Recommendations made
- Drafts created (with draft IDs / thread refs)
- KB updates made
- Follow-ups added / resolved
- Notable observations (patterns surfaced, edge cases handled)

The log is the audit trail for `scripts/draft_safety_validator.py`, which scans it for send operations post-run.

## Step 10: empty-inbox handling

Even with zero new emails:

1. Check `tracker.md` for items due today or overdue
2. Generate a minimal report: "No new actionable emails since the last run"
3. Flag any overdue items
4. Escalate per tracker rules

Skip Steps 3-6 entirely on an empty inbox.

## Email link format

Reference every thread with this cold-resolvable form in reports, drafts to self, and chat summaries:

```
https://mail.google.com/mail/u/0/#search/rfc822msgid:<Message-ID>
```

`<Message-ID>` is the raw `Message-ID` header value (including the angle brackets, for example `<CAB...@mail.gmail.com>`), returned free by `threads.get` / `messages.get`. This link resolves on a cold click with no live browser session required, unlike a Gmail permalink id, which is why it is the correct form for a headless routine. This matches the scoped `rfc822msgid` exception for this skill in `CLAUDE.md`; other skills use the permalink form.

## Backlog handling

The **first run** covers only the last 30 days (`after:` in the search, or a client-side filter on thread date). Report in the summary how many older threads remain untouched. A deeper backfill is a deliberate, separate run with an explicit older date window that the user asks for, never a surprise side effect of the first run.

## Critical rules (stated multiple times)

1. **DRAFTS ONLY: NEVER SEND.** Non-negotiable. Stated again here. Never call any `gws` send verb.
2. **Gmail via `gws`, never the MCP connector.** The connector reads the wrong account.
3. **Privacy.** No passwords or credentials in the KB. Reference threads by ID for sensitive content.
4. **Accuracy over speed.** When unsure, flag for review. A wrong auto-draft is worse than no draft.
5. **Respect the KB.** Documented preferences are the source of truth. Don't override with judgment.
6. **Transparency.** Note every KB change in the triage log.
7. **First runs need oversight.** Document this expectation for the user.

## Error handling

| Situation | Behavior |
|---|---|
| KB files missing | Halt; direct the user to run `inbox-setup` |
| gws Gmail access unavailable | Halt with a clear message about the required tool |
| Web search unavailable for sender research | Skip the research step; note senders not researched |
| Draft creation fails | Skip that draft; note it in the log; the report continues |
| Report delivery fails | Save the report to a file as a fallback; notify the user |
| User has 100+ new emails | Stay within reasonable limits; flag the volume; offer to focus on priority categories only |
| Sender appears in both blocklist and tracker | Tracker wins (active conversation); note the inconsistency in the log |

## Tooling

| Script | Role |
|---|---|
| `scripts/kb_reader.py` | Reads + validates the 7-file KB. Returns parsed structure. Halts with an explicit error if required files are missing. |
| `scripts/search_window_calculator.py` | Computes `window_start` from cadence + current time. Returns `run_label`. Honors the Q1 override. |
| `scripts/draft_safety_validator.py` | Post-run scan of the action log for any send-shaped tool call. FAILs if detected. The deterministic enforcement of the never-send rule. |

## References

- [`references/kb_file_contract.md`](references/kb_file_contract.md): canonical 7-file contract (read perspective; mirrors `../inbox-setup/references/kb_file_contract.md`)
- [`references/triage_decision_framework.md`](references/triage_decision_framework.md): TAKE IT / WORTH / PASS / FLAG taxonomy
- [`references/drafts_only_safety.md`](references/drafts_only_safety.md): the never-send discipline canon

## Anti-patterns to reject

- **Sending emails** (drafts only, non-negotiable)
- Using the Gmail MCP connector instead of `gws` (wrong account)
- Operating without knowledge base files
- Storing passwords or credentials in the KB
- Skipping the learning loop (KB updates) at the end of a run
- Overriding the user's documented preferences with your own judgment
- Reading lowest-priority threads (waste of context)
- Including draft text previews in the report (the drafts are already in the Gmail client)
- Silently failing on missing tools

## Conventions that bind this skill

Generated output (report text, drafts, chat summaries, the triage log) follows the project prose rules in `CLAUDE.md`: no em dashes, sentence case, and the `writing-clearly-and-concisely` skill.

---

**Version:** 1.0.0
**Source:** ported from [`alirezarezvani/claude-skills`](https://github.com/alirezarezvani/claude-skills/tree/main/productivity/email/skills/inbox-triage) (MIT), Gmail access adapted to the `gws` CLI. Paired with `inbox-setup`.
