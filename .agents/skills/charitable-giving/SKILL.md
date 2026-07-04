---
name: charitable-giving
description: >
  Track charitable donations and estimate their tax deduction value. Use for
  tithing/giving totals, donation receipts, year-end charitable summaries, or
  deciding whether itemizing beats the standard deduction.
---

# Charitable Giving Tracker

## Overview
Finds charitable donations in your transaction history, totals annual giving by organization, classifies each as deductible or not, and estimates the tax deduction value. Helps you plan giving and prepare for tax season.

## YNAB tools
- `ynab_get_transactions` — pull posted transactions since the start of the tax year (`sinceDate`); always pass `limit: 100000` so you get the full window — the default limit is 100, which silently returns only the oldest rows and drops everything newer. Filter rows yourself by `payee_name`, `memo`, or `category_name` to find donations, then group by `payee_name` and sum the `amount` field for per-organization totals. `amount` is a STRING in dollars (e.g. `"-3760.14"`) — coerce it with `Number(amount)` before any sum or comparison, and do NOT divide by 1000 (it is already dollars). Rows come back ascending by date (oldest first).

## Workflow
1. Call `ynab_get_transactions({ sinceDate: "<Jan 1 of the tax year>", limit: 100000 })`. Result is the posted transaction list, ascending by date (oldest first) — sort by `date` descending client-side if you present rows newest-first.
2. Filter the rows to charitable ones. A row counts if its `payee_name` or `memo` matches giving keywords — donation, charity, charitable, church, tithe, nonprofit, 501c3, foundation, ministry, United Way, Red Cross, Salvation Army, Habitat, food bank, humane society, GoFundMe, donor, giving — OR its `category_name` is a giving/donations category. Result: a filtered list of donation rows.
3. Group the filtered rows by `payee_name` and sum each group's `amount` for a per-organization total — coerce each `amount` with `Number(amount)` first (it is a string in dollars; do NOT divide by 1000). Result: one total per organization.
4. Classify each organization as likely tax-deductible or not:
   - Deductible: donations to registered 501(c)(3) organizations (most churches, charities, foundations).
   - NOT deductible: GoFundMe for individuals, political campaigns, gifts to individuals.
   Result: every organization tagged Yes or No.
5. Present the giving summary:

   ```
   CHARITABLE GIVING SUMMARY (2026 Tax Year)
   ══════════════════════════════════════════════════
   Organization              Total Given  Deductible?
   ────────────────────────   ──────────   ──────────
   Local Church               $2,400       Yes
   Habitat for Humanity       $500         Yes
   Red Cross                  $250         Yes
   GoFundMe - J. Smith        $100         No
   ══════════════════════════════════════════════════
   Total Giving:              $3,250
   Tax-Deductible Giving:     $3,150
   Non-Deductible Giving:     $100
   ```

   Result: a table with total, deductible, and non-deductible giving.
6. Estimate the tax deduction value:
   - Only beneficial if total itemized deductions exceed the standard deduction ($14,600 single / $29,200 married filing jointly for 2025).
   - If itemizing, ask the user's marginal bracket (10%, 12%, 22%, 24%, 32%, 35%, 37%), then estimated tax savings = deductible amount × marginal rate. Example: $3,150 × 22% ≈ $693 saved.
   Result: a dollar estimate of tax savings, or a note that the standard deduction wins.
7. Flag recordkeeping: list every organization with $250+ given (needs a written acknowledgment letter from the org) separately from those under $250 (a bank/card statement suffices). Result: two lists keyed by the $250 threshold.

## Manual fallback (no YNAB)
1. Search your bank and credit card statements for the past calendar year. Most banks let you search by keyword — try "donation," "church," the names of organizations you support.
2. Check your email for donation receipts — search for "donation receipt," "thank you for your gift," "tax receipt," or "contribution."
3. In a spreadsheet, create columns: Date, Organization, Amount, Payment Method, Receipt on File (Y/N).
4. Total the Amount column: `=SUM(C2:C50)`.
5. For tax deduction estimation:
   - Check if you will itemize: add up mortgage interest (Form 1098), state/local taxes (up to $10,000), medical expenses (over 7.5% of AGI), and charitable giving. If the total exceeds the standard deduction ($14,600 single / $29,200 MFJ for 2025), you benefit from itemizing.
   - If itemizing, multiply total deductible giving by your marginal tax rate for estimated savings.
6. Verify 501(c)(3) status: search the IRS Tax Exempt Organization Search at apps.irs.gov/app/eos/ to confirm an organization qualifies.
7. For donations over $250: make sure you have a written letter from the org stating the amount, date, and that no goods/services were received in exchange (or describing what was received).
8. If you donated property (clothes, furniture, vehicles), you need a fair market value estimate. Salvation Army and Goodwill publish valuation guides on their websites.

## Notes
- This skill provides estimates only. It is NOT tax advice. Consult a tax professional or CPA for your specific situation.
- The standard deduction increases annually. Many taxpayers do not benefit from itemizing, which means charitable donations do not directly reduce their tax bill (though some years include an above-the-line deduction for cash donations — check current tax law).
- Cash donations are deductible up to 60% of AGI. Non-cash donations have lower limits (30% or 50% depending on type).
- Keep all receipts. For cash/check donations under $250, a bank statement or cancelled check is sufficient. For $250+, you must have a contemporaneous written acknowledgment from the organization.
- Donations to individuals, GoFundMe campaigns for personal causes, and political organizations are never tax-deductible, even if they feel charitable.
