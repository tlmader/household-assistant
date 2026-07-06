---
name: inbox-setup
description: "One-time setup skill that builds the personalized knowledge base the 'inbox-triage' skill reads on every run. Interviews the user about their email patterns, business context, reply style, and priorities using grill-me discipline (one question at a time, forcing format where possible, dependency-ordered, each question explains why I'm asking), then generates the 7-file knowledge base at the inbox-triage workspace. Run this once before using inbox-triage for the first time. Re-run when business, pricing, or priorities change significantly. Triggers: 'set up my inbox', 'configure inbox triage', 'set up my email system', 'configure email triage', 'build my email knowledge base', 'initialize email management', 'set up inbox triage', 'onboard email triage', or any variation where someone wants to get the email triage system running for the first time."
license: MIT
metadata:
  source: "Ported from alirezarezvani/claude-skills productivity/email/skills/inbox-setup (MIT). Provider-agnostic; the paired inbox-triage skill reads the KB via the gws CLI."
  build_pattern: "Path B (direct conversion)"
  paired_with: "inbox-triage (shared 7-file KB contract)"
  version: 1.0.0
---

# Inbox-setup: email triage onboarding

> **Paired with `inbox-triage`.** This skill writes the 7-file knowledge base at `${INBOX_TRIAGE_WORKSPACE}/Email/` that `inbox-triage` reads on every run. The file contracts (names, sections, fields) MUST match between the two skills exactly. See [`references/kb_file_contract.md`](references/kb_file_contract.md).

Run once (or re-run when business or priorities change). Interview the user about their email patterns, business context, reply style, and priorities. Generate the structured knowledge base in `${INBOX_TRIAGE_WORKSPACE}/Email/` that captures everything `inbox-triage` needs to process the inbox effectively.

## Workspace location

The knowledge base holds personal preferences (voice, blocklist, trackers) and must **not** be committed to this repository. It lives at `${INBOX_TRIAGE_WORKSPACE}/Email/`, where `INBOX_TRIAGE_WORKSPACE` is set in `~/.claude.json` (never committed), the same pattern this project uses for `PERSONAL_VAULT_PATH`. If the variable is unset, default to `~/.household-assistant/inbox-triage` and tell the user where the files were written.

The inbox this KB serves is the Gmail account the `gws` CLI is authenticated as, accessed by `inbox-triage` through `gws` (not the Gmail MCP connector, which may read the wrong account). This skill itself only writes local files; it does not touch the mailbox.

## Invocation triggers

- "set up my inbox"
- "configure inbox triage"
- "set up my email system"
- "configure email triage"
- "build my email knowledge base"
- "initialize email management"
- "set up inbox triage"
- "onboard email triage"

## Conduct discipline

**Do NOT generate all files at once.** Walk through the 8 sections one at a time. Each section commits its file(s) before moving on. Partial completion (for example, the user drops off mid-interview) still produces a usable partial KB.

Grill-me discipline applies throughout:

- **One question per turn.** Never bundle, even across section boundaries.
- **"Why I'm asking" on every question**, so users can answer well.
- **Forcing format where possible.** Multi-choice beats open-ended.
- **Dependency-ordered.** Q2 depends on Q1; downstream sections depend on upstream ones.

See [`references/grill_me_section_walk.md`](references/grill_me_section_walk.md) for the 8-section discipline detail.

## Knowledge base contract: files to produce

Exactly these files at `${INBOX_TRIAGE_WORKSPACE}/Email/`:

| File | Purpose | Required? |
|---|---|---|
| `email-taxonomy.md` | Classification system + report preferences | **Yes** |
| `email-patterns.md` | Reply voice, tone, templates, hard rules | **Yes** |
| `evaluation-framework.md` | Decision tree for opportunity emails | Only if the user receives pitches/opportunities |
| `rate-card.md` | Pricing, terms, negotiation posture | Only if the user has pricing |
| `blocklist.md` | Auto-skip senders + learned decline patterns | **Yes** (seeded, grows over time) |
| `tracker.md` | Active follow-ups, overdue items, deadlines | **Yes** (starts mostly empty) |
| `triage-log/` | Directory for per-run logs | **Yes** (created empty) |

The contract is identical to what `inbox-triage` expects. See [`references/kb_file_contract.md`](references/kb_file_contract.md) for the full spec.

## Stop condition (full interview)

Roughly 25-31 questions total across the 8 sections (depending on skip-logic). Hard ceiling: 35 questions including all sub-clarifications. Section 4 (Evaluation Framework) is skipped entirely when Section 1 surfaced no opportunity-email category, dropping the total by 6 questions and the rate-card file. After Section 8's confirmation + handoff message, intake is closed. **Never re-open it.** To change preferences later, the user re-runs the skill (which detects existing files and asks per-file: replace / merge / skip). The grill-me one-at-a-time rule applies across section boundaries: do NOT batch questions even when moving from S{n} to S{n+1}.

## Section 1: the big picture

Six grill-me questions, one at a time:

- **S1.Q1:** "What do you do? Give me your role and business in 1-2 sentences. *Why I'm asking:* Context shapes what email patterns to expect. A solo creator's inbox looks nothing like an enterprise PM's."
- **S1.Q2:** "What dominates your inbox? Pick the top 1-2: sales pitches / client work / internal team / newsletters / customer support / financial / other. *Why I'm asking:* Dominant categories drive the taxonomy."
- **S1.Q3:** "Rough volume split, for example '60% business inquiries, 20% ops, 20% noise'. *Why I'm asking:* The split tells me where to focus triage effort."
- **S1.Q4:** "Which email address(es) should triage cover? *Why I'm asking:* If multiple, I'll set up per-address taxonomies. The default is the account the `gws` CLI is authenticated as."
- **S1.Q5:** "Run frequency: once daily / 2x daily / 3x daily / on-demand only? *Why I'm asking:* Drives the default search window in triage (9h overlap for 2x/day)."
- **S1.Q6:** "Anyone helping manage email, an assistant, VA, or team, or solo? *Why I'm asking:* Persona handling differs for delegated inboxes."

**Action:** build a mental model. Do NOT write files yet. Note whether opportunity emails are a category (drives the S4 skip-logic).

## Section 2: email categories

Propose 5-7 categories based on Section 1. Pre-recommend a subset, not the whole template menu:

- New Opportunities
- Active Conversations
- Action Required
- Financial
- Important/Personal
- Informational
- Ignore/Low Priority

Then three forcing questions, one at a time:

- **S2.Q1:** "Here's my proposed taxonomy: [list]. Does this match your inbox reality: yes / mostly / no? *Why I'm asking:* If 'no', I need to redo the taxonomy before any other section makes sense."
- **S2.Q2:** "Missing categories? List them. (Skip if none.) *Why I'm asking:* Missing categories produce uncategorized emails downstream, which hurts triage quality."
- **S2.Q3:** "Which category takes the MOST time per email? *Why I'm asking:* That's where draft-reply effort needs to focus most."

**Action:** generate `email-taxonomy.md` with categories, signals (for each: trigger phrases / sender patterns / subject markers), and default actions per category.

## Section 3: reply style & voice

Six grill-me questions plus the critical sample request:

- **S3.Q1:** "Register: formal / casual / in-between? *Why I'm asking:* Calibrates the default voice; we'll refine from samples next."
- **S3.Q2:** "Three communication pet peeves, phrases you hate, openings you avoid. *Why I'm asking:* I treat these as forbidden tokens in drafts."
- **S3.Q3:** "Phrases or sign-offs you always use. List as many as come to mind. *Why I'm asking:* These are your voice fingerprints."
- **S3.Q4:** "Different persona for different contexts, for example an assistant replying as you? *Why I'm asking:* Persona context changes pronoun + signature handling."
- **S3.Q5:** "Typical reply length: one-liner / short paragraph / longer? *Why I'm asking:* Length is the easiest voice signal to get wrong."
- **S3.Q6:** "Hard rules, never X / always Y? (For example, never emojis, always reply within 24h, never take calls without context.) *Why I'm asking:* Hard rules are enforced as non-negotiable in every draft."

### S3.SAMPLES (the critical highest-quality input)

> **Paste 3-5 real sent emails from your inbox.**
>
> *Why I'm asking:* Self-description of voice is unreliable. Real samples are the best signal. I'll analyze them for voice patterns that supplement everything above. Use `scripts/voice_sample_analyzer.py` to extract patterns deterministically.

If the user runs a business, also ask about media kits, rate sheets, standard pitches, and repeated replies.

**Action:** generate `email-patterns.md` with a tone description (with do/don't examples), persona rules, templates, signatures, and hard rules. See [`references/voice_calibration.md`](references/voice_calibration.md) for the sample-extraction discipline.

## Section 4: evaluation framework (conditional)

**Skip-logic:** only run this section if Section 1 surfaced opportunity emails as a meaningful inbox category. Otherwise jump straight to Section 5.

Six grill-me questions, one at a time:

- **S4.Q1:** "First thing you check when pitched something: give me your gut filter. *Why I'm asking:* That's the top of the decision tree."
- **S4.Q2:** "Three instant deal-breakers, things that make you decline immediately. *Why I'm asking:* These become PASS-auto signals."
- **S4.Q3:** "Three things that make you immediately interested. *Why I'm asking:* These become TAKE-IT signals."
- **S4.Q4:** "Standard pricing / terms, or 'no fixed pricing' if you negotiate every time. *Why I'm asking:* If you have a rate card, I'll generate one; if not, I'll skip."
- **S4.Q5:** "Negotiation posture: firm / flexible / depends on context? *Why I'm asking:* Drives draft tone on counter-offers."
- **S4.Q6:** "VIP senders or organizations that always get engagement. List names or domains. *Why I'm asking:* The VIP list bypasses normal PASS filters."

**Action:** generate `evaluation-framework.md` (decision tree + recommendation categories + VIP list) AND `rate-card.md` if pricing exists.

## Section 5: blocklist & patterns

Three grill-me questions, one at a time:

- **S5.Q1:** "Senders or domains to always skip. List them. (Skip if none.) *Why I'm asking:* An auto-blocklist saves the most time per run."
- **S5.Q2:** "Patterns in emails you always delete, for example 'unsubscribe' links from specific marketers, recruiter cold outreach, newsletters? *Why I'm asking:* Patterns let triage auto-skip variants without exact-match maintenance."
- **S5.Q3:** "Specific companies / recruiters / newsletters wasting time. List any. *Why I'm asking:* These seed the blocklist; triage will add more as you override decisions."

**Action:** generate `blocklist.md` (auto-maintained by triage thereafter).

## Section 6: current state

Three grill-me questions, one at a time:

- **S6.Q1:** "Active threads you're tracking. List with one-line context each. (Skip if none.) *Why I'm asking:* These become tracker entries so triage knows the existing context."
- **S6.Q2:** "Overdue replies, anything you should have responded to but haven't? *Why I'm asking:* Triage flags these as priority every run until resolved."
- **S6.Q3:** "Time-sensitive items with deadlines. List with dates. *Why I'm asking:* The tracker enforces deadlines and surfaces them as overdue at the right time."

**Action:** generate `tracker.md` with an active follow-ups table, an overdue section, an empty resolved section, and an empty update log. Also create the empty `triage-log/` directory.

## Section 7: report preferences

Three grill-me questions, one at a time:

- **S7.Q1:** "Delivery format, pick one: email draft to self / file in workspace / chat summary only. *Why I'm asking:* The triage report goes here every run."
- **S7.Q2:** "Detail level, pick one: 30-second scan / detailed breakdown / both (scan first, expand on request). *Why I'm asking:* Affects report length."
- **S7.Q3:** "Anything always shown first, for example overdue payments, VIP messages? *Why I'm asking:* Custom 'top-of-report' rules surface what you care about above the standard sections."

**Action:** save these preferences into `email-taxonomy.md` under a "Report Preferences" section.

## Section 8: confirmation & handoff

List every file created with a one-sentence summary. Then:

> Your triage system is ready. Run the **inbox-triage** skill to process your inbox. First runs need oversight; the system learns from your edits and overrides.

Remind the user: re-run this setup anytime business, pricing, or priorities change.

Run `scripts/kb_validator.py --workspace ${INBOX_TRIAGE_WORKSPACE}` to confirm the 7-file contract is satisfied before the final handoff.

## Privacy boundary

**Never persist passwords, full account numbers, SSNs, or other sensitive credentials in knowledge base files.** If the user volunteers such info during the interview, acknowledge it but don't store it; the relevant KB file gets `[stored separately by user]` in its place.

## Re-run behavior

Re-running on an existing setup:

1. Detect `${INBOX_TRIAGE_WORKSPACE}/Email/`
2. For each existing file, ask per-file: **replace / merge / skip**
3. Walk only the sections whose files the user chose to update
4. Skip sections whose files the user kept

## Error handling

| Situation | Behavior |
|---|---|
| Workspace inaccessible | Stop. Tell the user where files would go and ask for permission/path |
| User refuses to share samples | Use self-description; flag in the patterns file that calibration may need iteration |
| User says "skip this" mid-interview | Honor it; flag the gap in the file as `[needs follow-up]` |
| Sensitive info volunteered | Acknowledge but don't persist; note in the file as `[stored separately by user]` |
| Re-run on an existing setup | Detect existing files; ask the user per-file: replace, merge, skip |
| User has no pricing / opportunities | Skip Section 4 entirely; don't create empty files |

## Tooling

| Script | Role |
|---|---|
| `scripts/kb_validator.py` | Validates the 7-file KB output (required files present, conditional files only if their sections ran, headers + structure correct). |
| `scripts/section_progress_tracker.py` | JSON-backed walk state at `~/.inbox_setup_sessions/<session>.json`. Tracks the active section, answered questions, and committed files. |
| `scripts/voice_sample_analyzer.py` | Extracts voice patterns from pasted sent-email samples: opening phrases, sign-offs, length distribution, register markers. |

## References

- [`references/kb_file_contract.md`](references/kb_file_contract.md): the canonical 7-file contract (write perspective; the mirror lives in `../inbox-triage/references/`)
- [`references/grill_me_section_walk.md`](references/grill_me_section_walk.md): 8-section discipline, skip-logic, commit-per-section
- [`references/voice_calibration.md`](references/voice_calibration.md): sample-based voice extraction theory + anti-patterns

## Anti-patterns to reject

- Generating all files at once instead of walking through sections
- Asking all questions in one batch
- Hardcoded provider references (Gmail-only thinking in the KB content; the KB is provider-agnostic)
- Persisting sensitive credentials in the knowledge base
- Skipping the "why this question matters" explanation
- Skipping the sample-emails ask for voice (it's the highest-quality input)
- Overwriting existing files without consent on re-run
- Forcing creation of `rate-card.md` or `evaluation-framework.md` when they don't apply

## Conventions that bind this skill

Generated KB content and chat text follow the project prose rules in `CLAUDE.md`: no em dashes, sentence case, and the `writing-clearly-and-concisely` skill.

---

**Version:** 1.0.0
**Source:** ported from [`alirezarezvani/claude-skills`](https://github.com/alirezarezvani/claude-skills/tree/main/productivity/email/skills/inbox-setup) (MIT). Paired with `inbox-triage`.
