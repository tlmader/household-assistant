---
name: debt-payoff
description: >
  Build avalanche or snowball debt payoff plans with month-by-month payment
  schedules. Use when the user wants to pay down credit cards, loans, or other
  debt faster, compare payoff strategies, or see total interest and time to debt-free.
---

# Debt Payoff Plan

## Overview
Builds a structured debt payoff plan using either the avalanche method (highest APR first) or snowball method (smallest balance first). Reads the user's liability accounts from YNAB, estimates extra payment capacity, and generates a month-by-month payoff schedule with total interest and time-to-payoff for each method.

## YNAB tools
- `ynab_budget_summary({month: 'current'})` — read `accounts[]` for liability balances, APRs, and minimum payments, and `monthBudget`/`monthBudget.categories` to estimate extra payment capacity. All amounts from `ynab_budget_summary` are in **milliunits — divide by 1000 for dollars.**

## Workflow
1. Call `ynab_budget_summary({month: 'current'})`. From `accounts[]`, select debts: accounts whose `type` is a liability (`creditCard`, `lineOfCredit`, `mortgage`, `autoLoan`, `studentLoan`, `medicalDebt`, `otherLiability`, `otherDebt`) **with a negative `balance`**. For each, amount owed = `abs(balance) / 1000`. Checkable result: a list of debts, each with a name and dollar balance.
2. For each debt, read APR from `debt_interest_rates` and minimum payment from `debt_minimum_payments` — month-keyed maps, so take the latest month's entry. Units differ:
   - `debt_interest_rates` is milliunits of a **percent** (e.g. `2250` → 2.25%). Convert to the decimal rate used in step 6 with `raw / 100000` (`2250` → `0.0225`).
   - `debt_minimum_payments` is plain milliunits (`raw / 1000` → dollars, e.g. `3925140` → `$3,925.14`).

   Sanity-check each value. If a debt's rate or minimum is missing, zero, or implausible (e.g. APR > 40% or a minimum larger than the balance — credit cards often have no rate entered in YNAB), **ask the user** to confirm before continuing. Checkable result: every debt has a confirmed decimal APR and dollar minimum payment.
3. Estimate extra payment capacity = `monthBudget.income / 1000` minus total essential spending (sum `abs(activity) / 1000` over essential `monthBudget.categories` such as housing, utilities, groceries, transportation, insurance). If essentials are ambiguous or income looks off, **ask the user** for their monthly extra-payment number. If capacity is negative, flag overspending and stop. Checkable result: a single dollar figure for extra monthly capacity (≥ 0).
4. Build the **Avalanche Plan** — order debts by APR descending. Pay the minimum on every debt and direct all extra capacity to the top debt. When a debt hits $0, roll its full payment into the next debt in order.
5. Build the **Snowball Plan** — order debts by balance ascending. Same rollover rule, but the extra capacity always targets the smallest remaining balance.
6. For each plan, simulate month by month. Monthly interest = `balance * (APR / 12)` (APR = the decimal rate from step 2, e.g. `0.0225`); principal = `payment - interest`; new balance = `balance - principal`. Render the schedule:

   ```
   Month | Debt Name     | Payment | Principal | Interest | Remaining Balance
   ------+---------------+---------+-----------+----------+------------------
   1     | Credit Card A | $350    | $320.83   | $29.17   | $1,679.17
   1     | Student Loan  | $150    | $112.50   | $37.50   | $14,887.50
   ```

   Checkable result: a complete table per plan ending when all balances reach $0.
7. Summarize each plan: total months to debt-free, total interest paid, total amount paid.

   ```
   Method    | Time to Debt-Free | Total Interest | Total Paid
   ----------+-------------------+----------------+-----------
   Avalanche | 27 months         | $2,140         | $18,640
   Snowball  | 28 months         | $2,395         | $18,895
   ```

8. Recommend a method: avalanche when it saves meaningfully more interest, snowball when the user values faster psychological wins from clearing small balances. State the interest difference in dollars.

## Manual fallback (no YNAB)
1. List all debts in a spreadsheet with columns: Creditor, Balance, APR, Minimum Payment.
2. Find your monthly extra payment: from your bank statement, sum income deposits, subtract all non-debt expenses. Whatever remains beyond minimum payments is your extra payment.
3. For the **avalanche method**, sort by APR descending. For **snowball**, sort by Balance ascending.
4. In a new sheet, build a payoff schedule. For each month and each debt:
   - Monthly interest = `Balance * (APR / 12)`
   - Payment = minimum payment (+ extra for the target debt)
   - Principal paid = Payment - Interest
   - New Balance = Old Balance - Principal Paid
5. Useful Google Sheets formulas for a single debt:
   - Interest: `=B2*(C2/12)` where B2 is balance, C2 is APR as a decimal
   - Principal: `=D2-E2` where D2 is payment, E2 is interest
   - New Balance: `=B2-F2`
6. When one debt reaches $0, redirect its full payment to the next debt in your priority order.
7. Free calculators: unbury.me, powerpay.org, or the NerdWallet debt payoff calculator.
8. Sum the Interest column for each method to see which saves more.

## Notes
- Avalanche saves the most money in interest. Snowball provides faster wins by eliminating small debts quickly. Both are valid — choose the one you will stick with.
- This plan assumes fixed interest rates. Variable-rate debts may change the optimal strategy.
- If extra payment capacity is under $50/month, focus on increasing income or cutting expenses before accelerating payoff.
- Do not reduce emergency fund contributions to zero to accelerate debt payoff. A $1,000 starter emergency fund is recommended while paying off debt.
