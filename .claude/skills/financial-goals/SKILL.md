---
name: financial-goals
description: >
  Track savings-goal progress and required monthly contributions. Use for goal
  dashboards, "am I on track for my down payment / vacation fund", or setting up
  a new savings target with a timeline.
---

# Financial Goals Tracker

## Overview
Reports progress toward savings goals and the monthly contribution each requires to hit its target date. YNAB has native goals, so prefer them: read goal fields straight off your budget categories. For goals you track outside YNAB, fall back to a target plus a designated account balance.

## YNAB tools
- `budget_summary` — primary source. `categories[]` carries native goal fields (`goal_target`, `goal_overall_funded`, `goal_overall_left`, `goal_percentage_complete`, `goal_target_month`); `accounts[]` provides balances for goals tracked outside YNAB. Every amount from `budget_summary` is in **milliunits — divide by 1000** for dollars.

## Workflow
1. Call `budget_summary({ month: 'current' })`.
2. Identify native goals: every category in `categories[]` with `goal_target > 0`. This is your goal list (no need to ask the user to define them). Result: a list of goal categories.
3. For each native goal, convert milliunit fields to dollars (divide by 1000): `goal_target`, `goal_overall_funded`, `goal_overall_left`. Percent complete is `goal_percentage_complete` (already a percent). Result: per-goal target, funded, left, and percent.
4. For each native goal, compute the required monthly contribution. Months remaining = whole months from today to `goal_target_month` (minimum 1). Required monthly = `(goal_overall_left / 1000) / months remaining`. If `goal_target_month` is null, mark required as "no date — open-ended". Result: a required-monthly figure (or "open-ended") per goal.
5. For any goal the user tracks OUTSIDE YNAB, ask for its name, target amount, and target date, then read the balance of its designated account from `accounts[]` (divide by 1000). Compute percent and required monthly the same way as steps 3-4. Result: outside goals merged into the goal list.
6. Render the dashboard with a progress bar per goal (20 cells, one filled cell per 5%):

   ```
   FINANCIAL GOALS
   ═══════════════════════════════════════════════════════
   Vacation Fund
     Target: $3,000 by Dec 2026  |  Funded: $1,200 (40%)
     Left: $1,800  |  Required: $300/mo
     [████████░░░░░░░░░░░░] 40%

   Down Payment
     Target: $40,000 by Jun 2028  |  Funded: $12,000 (30%)
     Left: $28,000  |  Required: $1,120/mo
     [██████░░░░░░░░░░░░░░] 30%
   ═══════════════════════════════════════════════════════
   Total required: $1,420/mo
   ```

   Result: one block per goal with a filled progress bar.
7. Sum required monthly across all goals (skip open-ended ones) for the "Total required" line. Result: a total monthly obligation figure.
8. Prioritize goals by `goal_target_month` (soonest first) and call out any goal whose `goal_percentage_complete` lags the time elapsed toward its target month. Result: an ordered list with behind-schedule goals flagged.

## Manual fallback (no YNAB)
1. Open a spreadsheet with columns: Goal Name, Target Amount, Target Date, Current Balance, Monthly Required.
2. For current balance, check the account(s) designated for each goal. If you use a single savings account for everything, track allocations manually (one row per goal with a running tally).
3. Months remaining in Google Sheets: `=DATEDIF(TODAY(), C2, "M")` where C2 is the target date.
4. Monthly required: `=(B2-D2)/E2` where B2 is target, D2 is current balance, E2 is months remaining.
5. Sum the "Monthly Required" column for your total goal obligations.
6. Check monthly savings capacity: review last month's statement, total deposits minus non-savings expenses.
7. If total required exceeds capacity, push target dates out or reduce amounts.
8. Apps that help: Ally Bank "Buckets", Capital One 360 multiple savings accounts, and YNAB's explicit goal tracking.
9. Set up automatic transfers for each goal amount on payday so progress does not depend on willpower.

## Notes
- Prefer YNAB native goals over manual tracking — set goals on categories in YNAB so `goal_*` fields populate and this skill reads them directly.
- A single savings account funding multiple goals cannot be split by goal from `accounts[]` alone; use per-category YNAB goals (or separate accounts) to attribute progress.
- Reassess goals quarterly. Life changes, and rigid goals that no longer matter drain motivation.
- Prioritize goals with fixed deadlines (tax payments, tuition) over flexible ones (vacation, new car).
