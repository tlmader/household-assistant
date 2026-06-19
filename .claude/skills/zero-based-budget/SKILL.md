---
name: zero-based-budget
description: >
  Build a zero-based budget that assigns every dollar of income a job, using YNAB's current-month
  budget. Triggers: zero-based budget, every dollar a job, give my money jobs, allocate my income,
  50/30/20 plan, budget so my to-be-budgeted hits zero.
---

# Zero-Based Budget

## Overview
Builds a zero-based budget where every dollar of income is assigned a job — spending, saving, or debt repayment — until nothing is left unassigned. YNAB is itself a zero-based tool, so this skill reads the live budget, confirms whether it already balances to zero, and reworks per-category allocations against the 50/30/20 guideline.

## YNAB tools
- `budget_summary` — call with `{month: 'current'}`. Read `monthBudget.income` for monthly income, `monthBudget.to_be_budgeted` for the zero-based check, and `categories[]` (`budgeted`, `activity`, `balance`, `category_group_name`) to build the plan and spot overspending. All amounts from `budget_summary` are in **milliunits — divide by 1000** for dollars.

## Workflow
1. Run `budget_summary({month: 'current'})`. Set Income = `monthBudget.income / 1000`. This is the planning baseline. Checkable result: a dollar income figure.
2. Compute the zero-based check: `to_be_budgeted = monthBudget.to_be_budgeted / 1000`. If it is `$0`, the budget is already fully assigned; if positive, that amount is still unassigned; if negative, the budget is over-assigned. Checkable result: a stated to-be-budgeted dollar amount and one of {balanced / under-assigned / over-assigned}.
3. For each entry in `categories[]`, compute budgeted = `budgeted / 1000` and actual = `abs(activity) / 1000`. Flag any category where `balance < 0` as overspent. Checkable result: a per-category list of budgeted vs actual, plus the set of overspent categories.
4. Map each category into NEEDS / WANTS / SAVINGS & DEBT using its `category_group_name` and build the budget from these real categories:

   ```
   ZERO-BASED BUDGET
   ══════════════════════════════════════════════════
   Monthly Income:                         $X,XXX.XX
   ══════════════════════════════════════════════════

   NEEDS (Target: 50% = $X,XXX)
   ──────────────────────────────────────────────────
   Housing/Rent               $X,XXX   (actual: $X,XXX)
   Utilities                  $XXX     (actual: $XXX)
   Groceries                  $XXX     (actual: $XXX)
   Transportation             $XXX     (actual: $XXX)
   Insurance                  $XXX     (actual: $XXX)
   Minimum Debt Payments      $XXX     (actual: $XXX)
   Healthcare                 $XXX     (actual: $XXX)

   WANTS (Target: 30% = $X,XXX)
   ──────────────────────────────────────────────────
   Dining Out                 $XXX     (actual: $XXX)
   Entertainment              $XXX     (actual: $XXX)
   Shopping                   $XXX     (actual: $XXX)
   Subscriptions              $XXX     (actual: $XXX)
   Personal Care              $XXX     (actual: $XXX)

   SAVINGS & DEBT (Target: 20% = $X,XXX)
   ──────────────────────────────────────────────────
   Emergency Fund             $XXX
   Retirement                 $XXX
   Extra Debt Payment         $XXX
   Other Savings Goals        $XXX

   ══════════════════════════════════════════════════
   TOTAL ALLOCATED:                      $X,XXX.XX
   REMAINING TO ASSIGN:                  $0.00
   ══════════════════════════════════════════════════
   ```

   Checkable result: a filled template grouped into the three buckets.
5. Compare each bucket's total to its 50/30/20 target and flag buckets that exceed the guideline. Checkable result: a per-bucket over/under-guideline verdict.
6. If total allocations exceed income, reduce the largest WANTS categories until the budget reaches zero. If a surplus remains, assign it to SAVINGS & DEBT. Checkable result: TOTAL ALLOCATED equals income.
7. Present the final budget with REMAINING TO ASSIGN at exactly `$0.00`. Checkable result: remaining line reads `$0.00`.

## Manual fallback (no YNAB)
1. Calculate your monthly take-home pay. If you are salaried, check your pay stub for net pay and multiply by pay frequency (biweekly = x26/12, semi-monthly = x2). If variable, use your lowest recent month.
2. Export one month of transactions from your bank as CSV.
3. In a spreadsheet, categorize every transaction. Create a pivot table summing by category.
4. Open a new sheet and list every category with its actual average. Add a "Budget" column next to it.
5. Start with fixed expenses (rent, utilities, insurance, loan minimums) — these are non-negotiable. Enter them as-is in the Budget column.
6. For variable needs (groceries, gas), set the budget at or slightly below the 3-month average.
7. For wants (dining, entertainment, shopping), set budgets that fit within 30% of income.
8. Allocate remaining dollars to savings and debt categories.
9. Check: `=SUM(BudgetColumn)` should equal your income. If not, adjust until it does.
10. Free tools for ongoing tracking: YNAB (You Need A Budget) is built entirely around zero-based budgeting. EveryDollar (by Ramsey Solutions) is a free alternative.
11. Google Sheets template formula for remaining: `=Income - SUM(B2:B30)` — this cell should read $0.

## Notes
- Zero-based budgeting works best when done before each month starts, since every month has different needs (holidays, birthdays, irregular bills).
- The 50/30/20 split is a guideline, not a rule. High cost-of-living areas may require 60%+ on needs.
- If income is irregular (freelance, commission), budget based on the lowest expected month and treat extra income as a bonus to allocate.
- Review and adjust the budget monthly. A budget that does not evolve with your life will be abandoned.
