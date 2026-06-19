---
name: net-worth
description: >
  Calculate net worth from YNAB account balances with a formatted assets,
  liabilities, and net worth statement. Use for net worth snapshots or
  tracking net worth change over time.
---

# Net Worth Tracker

## Overview
Builds a net worth statement directly from YNAB account balances: assets minus liabilities. No user input is needed for accounts YNAB already tracks; you only ask about assets YNAB does not see (home value, vehicles, etc.).

## YNAB tools
- `budget_summary({month: 'current'})` — returns `accounts[]` with `name`, `type`, `balance`, and `closed`. This is the sole data source: assets, liabilities, and net worth all come from these balances. Every `balance` is in **milliunits — divide by 1000 for dollars.**

## Workflow
1. Call `budget_summary({month: 'current'})` and take `accounts[]`. Drop any account where `closed` is true. Result: a list of open accounts with name, type, and balance.
2. Classify each account by `type`:
   - **Assets** (`checking`, `savings`, `cash`, `otherAsset`): balances are positive. Convert each to dollars (`balance / 1000`).
   - **Liabilities** (`creditCard`, `lineOfCredit`, `mortgage`, `autoLoan`, `studentLoan`, `medicalDebt`, `otherLiability`, `otherDebt`): balances are negative. Show them as positive amounts owed (`-balance / 1000`).
   Result: every open account is sorted into exactly one column.
3. Compute net worth as the sum of all `balance` values divided by 1000 (liabilities are negative, so they subtract automatically). Result: a single dollar figure that equals TOTAL ASSETS minus TOTAL LIABILITIES.
4. Render the statement using the real account names grouped by type:

   ```
   ASSETS
   ──────────────────────────────────
   <Account name>          $X,XXX.XX
   <Account name>          $X,XXX.XX
   ──────────────────────────────────
   TOTAL ASSETS            $XX,XXX.XX

   LIABILITIES
   ──────────────────────────────────
   <Account name>          $X,XXX.XX
   <Account name>          $X,XXX.XX
   ──────────────────────────────────
   TOTAL LIABILITIES       $XX,XXX.XX

   ══════════════════════════════════
   NET WORTH               $XX,XXX.XX
   ══════════════════════════════════
   ```

   Result: a statement whose NET WORTH line matches the figure from step 3.
5. Offer to add assets YNAB does not track (home value, vehicles, other property). If the user provides any, add them under ASSETS, recompute the totals and net worth, and re-render. Result: the statement reflects all accounts plus any user-supplied assets.
6. If the user supplies a prior net worth figure, show the delta (current minus prior) and call out the biggest driver of the change. The MCP keeps no snapshots, so this comparison only happens when the user provides the earlier number. Result: a stated change amount, or a note that no prior figure was given.

## Manual fallback (no YNAB)
1. Open a new Google Sheets spreadsheet or download a net worth template (NerdWallet and Mint both offer free ones).
2. Create two sections: Assets and Liabilities.
3. For assets, log in to each account and record current balances:
   - Bank accounts: check your banking app or website
   - Investment accounts: Vanguard (balances page), Fidelity (portfolio summary), Schwab (account summary)
   - Retirement: check your 401k provider portal or most recent statement
   - Property: use Zillow Zestimate or Redfin estimate (search your address)
   - Vehicles: check Kelley Blue Book (kbb.com) private party value
4. For liabilities, gather current balances:
   - Credit cards: check each card's current balance online
   - Student loans: log into studentaid.gov for federal, or your servicer for private
   - Mortgage: check your most recent statement or lender portal
   - Auto loans: check your lender portal or most recent statement
5. Sum assets and liabilities separately, then calculate: `Net Worth = Total Assets - Total Liabilities`.
6. Save the file with today's date. Repeat monthly to track trends.
7. In Google Sheets, use `=SUM(B2:B8)` for total assets and `=SUM(B10:B15)` for total liabilities. Net worth: `=B9-B16`.

## Notes
- Property and vehicle values are estimates. Use conservative figures.
- Net worth is a snapshot — it changes daily with market fluctuations. Monthly tracking is sufficient for most people.
- Do not include personal property (furniture, electronics, clothing) unless it has significant resale value.
