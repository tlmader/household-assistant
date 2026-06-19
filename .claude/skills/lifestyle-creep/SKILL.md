---
name: lifestyle-creep
description: >
  Detect gradual spending increases across categories over a 6-12 month window — surface lifestyle creep after a raise, bonus, or debt payoff.
---

# Lifestyle Creep Detector

## Overview
Compares spending by category across two time windows to surface gradual, often unnoticed increases — the classic "lifestyle creep" that erodes savings as income grows. Highlights which categories drifted upward, by how much, and the annual cost.

## YNAB tools
- `budget_summary` — pull `categories[]` (with per-category `activity`) for each comparison month. All amounts are in **milliunits**; divide by 1000 for dollars. `activity` is negative for outflows, so use its absolute value as spend.
- `list_transactions` (optional) — for a flagged category, pull recent rows (amounts already in dollars, no conversion) to see which payees drove the increase.

## Workflow
1. Call `budget_summary({ month: 'current' })`. From the result, build a `{ category → spend }` map where spend = `abs(activity) / 1000`. **Checkpoint:** you have current-month spend per category in dollars.
2. Call `budget_summary` for the month 6 months earlier (e.g. if now is `2026-06-01`, use `month: '2025-12-01'`). Build the same baseline `{ category → spend }` map. **Checkpoint:** you have baseline spend per category in dollars.
3. (Optional smoother baseline) Average 3 months per period instead of one: call `budget_summary` for each of the 3 most recent months and the 3 months around the 6-months-ago point, then average each category's spend within each period. **Checkpoint:** each category has one current average and one baseline average.
4. For each category present in both periods, compute:
   - Dollar change: `current − baseline`
   - Percentage change: `(current − baseline) / baseline * 100`
   **Checkpoint:** every category has a dollar change and a % change.
5. Flag a category as lifestyle creep when it increased by **more than 15% AND more than $50/month**. Sort flagged categories by dollar increase descending. **Checkpoint:** you have a sorted list of flagged categories (possibly empty).
6. Render the comparison table:

   ```
   LIFESTYLE CREEP ANALYSIS (6-month comparison)
   ══════════════════════════════════════════════════════
   Category         6mo Ago    Now        Change    %
   ──────────────   ────────   ────────   ───────   ────
   Dining Out       $280       $420       +$140     +50%  !!
   Shopping         $350       $480       +$130     +37%  !!
   Groceries        $520       $580       +$60      +12%
   Entertainment    $120       $165       +$45      +38%  !
   Transportation   $200       $195       -$5       -3%
   ══════════════════════════════════════════════════════
   Total Creep: +$370/mo  |  Annual Impact: +$4,440/yr
   ```

   **Checkpoint:** the table lists each compared category with both periods, dollar change, and % change.
7. Sum the monthly increases across all flagged categories and multiply by 12 for the annual impact. **Checkpoint:** the table footer shows total monthly creep and annual impact.
8. Suggest a concrete target, e.g. "If you returned Dining Out and Shopping to 6-month-ago levels, you would save $3,240/year." **Checkpoint:** at least one named savings target with a dollar figure.
9. (Optional) For the top flagged category, call `list_transactions` (or `transactions_by_category` with that category's `id`) and group rows by payee to show what drove the increase. **Checkpoint:** the largest contributors to the increase are named.

## Manual fallback (no YNAB)
1. Export 12 months of transactions from your bank as CSV.
2. Open in Google Sheets. Add a "Month" column using `=TEXT(A2, "YYYY-MM")` where A2 is the transaction date.
3. Create a pivot table: Rows = Category, Columns = Month, Values = SUM of Amount.
4. In a new row below each category, calculate the average of the first 3 months and the last 3 months.
5. Add a "Change" column: `=AVERAGE(last 3 months) - AVERAGE(first 3 months)`.
6. Add a "% Change" column: `=Change / ABS(AVERAGE(first 3 months)) * 100`.
7. Conditional format: highlight any row where Change > $50 AND % Change > 15% in red.
8. Create a line chart for each flagged category to visually confirm the upward trend (select the monthly totals row, Insert > Chart > Line).
9. Common lifestyle creep categories: dining out, coffee shops, clothing, subscription upgrades, grocery store purchases (premium brands replacing store brands), rideshare instead of transit.

## Notes
- Not all spending increases are lifestyle creep. Inflation, a new family member, or a necessary expense change are legitimate. Review flagged items in context.
- Seasonal effects can look like creep — holiday spending in Q4, summer travel, back-to-school shopping. Averaging 3 months per period (step 3) or running a 12-month lookback smooths most of this.
- Lifestyle creep is most common after a raise, bonus, or debt payoff. Run this skill within 3 months of any income increase.
- The goal is not to eliminate all increases, but to make them intentional. Spending more on something you value is fine; drifting upward without noticing is the problem.
