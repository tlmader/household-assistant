---
name: emergency-fund
description: >
  Calculate an emergency fund target from essential expenses, check the current
  savings balance, and estimate months to reach 3/4/6-month coverage. Use for
  "emergency fund", "rainy day fund", "how many months of expenses", or "am I
  covered if I lose my job".
---

# Emergency Fund Calculator

## Overview
Sizes an emergency fund target from monthly essential expenses, reads the current emergency-fund savings balance, and estimates how long it takes to reach 3-, 4-, and 6-month coverage at the user's savings rate.

## YNAB tools
- `budget_summary({month:'current'})` — source for essential-category spend (`categories[].activity`) and the savings-account balance (`accounts[]`). To smooth a noisy month, call it again per recent month (ISO like `2026-05-01`) and average. All `budget_summary` amounts are in **milliunits — divide by 1000 for dollars**.

## Workflow
1. Call `budget_summary({month:'current'})`. Optionally call it for the prior 1-2 months and average the essential totals.
2. From `categories[]`, sum `abs(activity)/1000` across essential category groups only: Housing/Rent, Utilities, Groceries, Transportation, Insurance, Healthcare, and minimum debt payments. This is **monthly essential expenses**. Result: one dollar figure.
3. Compute targets from monthly essentials:
   - **Minimum (3 months):** essentials x 3
   - **Standard (4 months):** essentials x 4
   - **Comfortable (6 months):** essentials x 6
4. From `accounts[]`, take the `balance` (÷1000) of the savings account (`type: savings`) that holds the emergency fund. If more than one savings account exists, ask the user which one is the emergency fund. Result: current emergency-fund balance.
5. Establish the monthly savings rate: ask the user, or infer it from recent `monthBudget` income minus expenses (÷1000). Result: one dollar/month figure.
6. For each target compute months to goal: `(target − current balance) / monthly savings rate`. A non-positive gap means the target is already met (0 months).
7. Present the progress report:

   ```
   Monthly Essential Expenses:  $X,XXX
   Current Emergency Fund:      $X,XXX
   Monthly Savings Rate:        $X,XXX

   Target        Amount     Gap        Months to Goal
   ─────────     ────────   ────────   ──────────────
   3-month       $X,XXX     $X,XXX     X months
   4-month       $X,XXX     $X,XXX     X months
   6-month       $X,XXX     $X,XXX     X months

   Progress: [████████░░░░░░░░░░░░] 42%
   ```

   Progress bar = current balance ÷ 6-month target.
8. If the savings rate makes the timeline long, point to specific non-essential category groups from `categories[]` where cuts could be redirected to savings.

## Manual fallback (no YNAB)
1. Export 3 months of bank transactions as CSV.
2. In a spreadsheet, filter to essential categories only: rent/mortgage, utilities (electric, gas, water, internet), groceries, transportation (gas, transit passes), insurance premiums, minimum loan payments, and healthcare.
3. Sum essential expenses for each month, then average: `=AVERAGE(B2:B4)` across 3 months.
4. Multiply the average by 3, 4, and 6 for your targets.
5. Check your savings account balance (log into your bank).
6. Calculate how much you saved last month: look at transfers from checking to savings, or compare beginning and ending savings balances on your statement.
7. Divide each gap (`target − current balance`) by your monthly savings amount.
8. To accelerate: review non-essential categories (dining out, subscriptions, shopping) and redirect them to savings.
9. Set up automatic transfers: most banks allow recurring transfers from checking to savings (Settings > Transfers > Recurring).

## Notes
- Essentials only — exclude dining out, entertainment, and shopping. You would cut those in an actual emergency.
- Self-employed or irregular income: target 6 months minimum.
- Keep emergency funds in a high-yield savings account (currently 4-5% APY), not invested in stocks.
- With high-interest debt (above 8% APR), consider a starter $1,000 fund while focusing on debt payoff, then build to 3-6 months.
