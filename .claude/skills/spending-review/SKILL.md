---
name: spending-review
description: >
  Generate a categorized spending breakdown with month-over-month trends, flag
  categories with notable increases, and drill into the transactions driving them.
---

# Spending Review

## Overview
Produces a categorized breakdown of spending for the current month, compares it against the prior month to surface trends, and drills into the categories where spending rose significantly.

## YNAB tools
- `ynab_budget_summary({month})` — pull `monthBudget.categories` (name, id, activity) for a month. Call it twice: once for the current month, once for the prior month, to build the comparison. Every dollar amount it returns is in **milliunits** — divide by 1000 for dollars (e.g. `activity` of `-452310` is -$452.31 spent).
- `ynab_get_transactions({categoryId, sinceDate, limit: 100000})` — drill into a flagged category for transaction-level detail. `amount` is a **string** in dollars (e.g. `"-452.31"`) — coerce it with `Number(amount)` before any math, and do NOT divide by 1000 (it is already dollars). Always pass `limit: 100000`: the default limit is 100 and the tool returns the *oldest* rows first, so a missing limit silently drops everything newer. Pass a `sinceDate` (the first of the prior month) so the drill-in covers the months under review, not years of history. If you only have the category name, omit `categoryId` and filter the returned rows by `category_name` — note `categoryId`/`accountId`/`payeeId` are mutually exclusive, so pass only one.

## Workflow
1. Call `ynab_budget_summary({month: "current"})`. Read `monthBudget.categories`, **skipping any with `hidden` or `deleted` true** (the tool returns them unfiltered, including the internal "Ready to Assign" row), and record each remaining category's `id` and `activity`, converting `activity / 1000` to dollars of spend. CHECK: you have a list of `{category, id, thisMonth}` dollar amounts.
2. Call `ynab_budget_summary` for the prior month (ISO first-of-month, e.g. `"2026-05-01"`). Convert each `monthBudget.categories` entry's `activity / 1000` to dollars. CHECK: you have `lastMonth` dollars for the same categories.
3. For each category compute the dollar change and percentage change between the two months. CHECK: every category row has `change ($)` and `change (%)`.
4. Flag any category where spending increased by more than 20% **or** more than $100. CHECK: you have a (possibly empty) list of flagged categories with their `id`s.
5. For each flagged category, call `ynab_get_transactions({categoryId: <that category's id>, sinceDate: <first of the prior month>, limit: 100000})` (or omit `categoryId` and filter the result by `category_name`) to pull the individual transactions driving the increase. `amount` is a **string** in dollars — coerce it with `Number(amount)` before summing or ranking, and do NOT divide by 1000 (it is already dollars). CHECK: each flagged category has its top transactions listed.
6. Render the summary table:

```
SPENDING REVIEW — Jun 2026 vs May 2026
──────────────────────────────────────────────────────────────
Category          This Month   Last Month   Change ($)  Change   Trend
──────────────────────────────────────────────────────────────
Groceries           $842.10      $610.45      +$231.65   +38%      ▲
Dining               $318.77      $402.10      -$83.33    -21%      ▼
Utilities            $204.00      $198.50      +$5.50      +3%      ►
...
──────────────────────────────────────────────────────────────
TOTAL              $4,210.55    $3,980.12     +$230.43     +6%
```

7. Below the table list the top 3 categories by absolute spending and the top 3 by percentage increase:

```
TOP SPEND (this month)        BIGGEST INCREASES (%)
1. Rent          $1,800.00    1. Groceries      +38%
2. Groceries       $842.10    2. Shopping       +27%
3. Dining          $318.77    3. Gas            +22%
```

8. Write a one-paragraph narrative summarizing the overall spending pattern and the notable changes, citing the driving transactions found in step 5. CHECK: every flagged category is explained in the narrative.

## Manual fallback (no YNAB)
1. Export your last two months of transactions as CSV files from your bank (most banks: Account > Statements > Download > CSV format).
2. Open both CSVs in Google Sheets. Combine them into one sheet with a "Month" column added.
3. If your bank doesn't categorize transactions, manually add a "Category" column. Common categories: Groceries, Dining, Transportation, Utilities, Entertainment, Shopping, Health, Subscriptions.
4. Create a pivot table: Rows = Category, Columns = Month, Values = SUM of Amount.
5. Add a calculated column for change: `=B2-C2` (this month minus last month).
6. Add a percentage change column: `=IF(C2<>0, (B2-C2)/ABS(C2)*100, "New")`.
7. Conditional format the change column: red for increases, green for decreases (since spending is negative, reverse the logic or use absolute values).
8. Sort by absolute change descending to see your biggest movers.
9. For a quick visual, insert a bar chart from the pivot table showing this month vs. last month by category.

## Notes
- One-time large purchases (appliances, travel, medical) can skew month-over-month comparisons. Consider whether a spike is a true trend or an outlier — the step-5 transaction drill-in usually makes this obvious.
- For a more meaningful view, compare against a 3-month rolling average rather than just the prior month (call `ynab_budget_summary` for additional prior months and average each `monthBudget.categories` entry's `activity / 1000`).
- `activity` is negative for outflows; use its absolute value when presenting spend so the table reads in positive dollars.
