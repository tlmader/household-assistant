---
name: subscription-audit
description: >
  Find recurring subscriptions, total their monthly and annual cost, and flag
  cancellation candidates. Use for subscription audits, recurring-charge reviews,
  or "what am I still paying for" questions.
---

# Subscription Audit

## Overview
Scan transaction history for recurring charges, total monthly and annual subscription spend, and rank cancellation candidates by cost so the user can decide what to drop.

## YNAB tools
- `ynab_get_transactions` — pull posted transactions over a long window to catch both monthly and annual subscriptions. Pass `limit: 100000` (the default of 100 silently drops most rows). Results come back ascending (oldest-first); sort by `date` descending if you need newest-first for display. Each `amount` is a string in dollars (already divided by 1000) — coerce with `Number(amount)` before any math; do not divide by 1000.
- `ynab_get_transactions` (with `categoryId`) — if a "Subscriptions" category exists, scope transactions to that category id to cross-check the payee-based detection. Pass `limit: 100000` here too. Each `amount` is a string in dollars — coerce with `Number(amount)` before any math; do not divide by 1000.

## Workflow
1. Call `ynab_get_transactions({sinceDate, limit: 100000})` with `sinceDate` ~18 months ago (e.g. an ISO date 18 months before today). The long window catches annual subscriptions that a 6-month look-back would miss; the large `limit` avoids silently dropping rows. Result: a list of dated transactions, ascending by date, with each `amount` a string in dollars — coerce with `Number(amount)` before summing.
2. Group the rows by `payee_name`. Result: one bucket per merchant with its charge dates and amounts.
3. Flag a payee as a subscription when it recurs at a regular cadence (monthly, quarterly, or annual) with a consistent amount. Compute each subscription's normalized monthly cost (annual ÷ 12, quarterly ÷ 3). Result: a list of confirmed subscriptions, each with cadence, charge amount, and monthly cost.
4. If a `monthBudget.categories` entry named "Subscriptions" (or similar) exists, call `ynab_get_transactions({categoryId, limit: 100000})` for it and reconcile against the payee list. Result: any subscription present in the category but missed in step 3, and vice versa, is accounted for.
5. Sum the normalized monthly costs to produce total monthly spend, then ×12 for the annualized total. Result: two dollar figures.
6. Render the dashboard below, sorted by annual cost descending. Result: a complete table with a totals line.

```
SUBSCRIPTION AUDIT  (last 18 months)
========================================================
Merchant          Cadence    Monthly    Annual   Active
--------------------------------------------------------
Adobe CC          monthly    $ 54.99   $ 659.88   18 mo
Disney+           monthly    $ 13.99   $ 167.88   12 mo
Amazon Prime      annual     $ 11.58   $ 139.00   2 yr
Spotify           monthly    $ 11.99   $ 143.88   18 mo
NYT               monthly    $  4.25   $  51.00    9 mo
--------------------------------------------------------
TOTAL                        $ 96.80  $1,161.64
========================================================
```

7. Rank cancellation candidates by annual cost (highest first) and ask the user which they still use. Result: a candidate list awaiting the user's keep/cancel decision.

```
CANCELLATION CANDIDATES (rank by cost — confirm usage)
--------------------------------------------------------
1. Adobe CC     $659.88/yr   Still using it?
2. Disney+      $167.88/yr   Still using it?
3. Spotify      $143.88/yr   Still using it?
--------------------------------------------------------
Potential annual savings if all cancelled: $971.64
```

## Manual fallback (no YNAB)
1. Export transactions from your bank as CSV (Chase: Statements & Documents > Download Account Activity > CSV; Bank of America: Statements & Documents > Download Transactions).
2. Open the CSV in a spreadsheet (Google Sheets or Excel).
3. Sort by the Description column and look for repeating merchant names with consistent amounts.
4. Add a helper column to flag repeats: in Google Sheets, `=IF(COUNTIF(B:B, B2) > 1, "Recurring", "One-time")` where column B is the merchant/description column.
5. Build a pivot table grouping by merchant, summing amounts and counting occurrences.
6. Any merchant appearing on a regular cadence with a consistent amount is likely a subscription.
7. Multiply each monthly charge by 12 (quarterly ×4, annual ×1) to get annual cost.
8. Review each subscription and ask: "Did I use this in the last 30 days?" Cancel anything you answer "no" to.
9. Common subscription merchants to look for: Netflix, Spotify, Hulu, Disney+, Amazon Prime, Adobe, Dropbox, iCloud, Google One, YouTube Premium, gym memberships, news subscriptions.

## Notes
- Detection relies on matching payee names. Some merchants use varying names across charges (e.g. a processor prefix), so eyeball near-duplicates before deciding a payee is one-time.
- Annual subscriptions charge once per year — the 18-month window is what surfaces them; do not shrink it.
- Free trials that convert to paid are easy to miss — watch for a small initial charge followed by recurring full-price charges from an unfamiliar payee.
- Recommend cancellations only; never approve transactions or move money. Leave the actual cancellation to the user.
