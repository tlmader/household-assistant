---
name: insurance-audit
description: >
  Find insurance payments, total annual premiums, and compare to benchmarks.
  Use when asked to audit insurance, review premiums, or check for overpaying on coverage.
---

# Insurance Audit

## Overview
Identifies all insurance-related transactions in your history, calculates your total annual insurance spend, breaks it down by type (auto, home/renters, life, etc.), and compares your costs to typical ranges so you can spot overpaying.

## YNAB tools
- `list_transactions` — pulls posted transactions (amounts already in dollars) so you can find every insurance premium payment across accounts and infer payment cadence from the dates.
- `budget_summary({month: 'current'})` (optional) — only for the *% of Annual Income* line: read `monthBudget.income` (milliunits ÷ 1000) and annualize (× 12).

## Workflow
1. Call `list_transactions({ sinceDate: <one year ago> })` to pull the last 12 months of posted transactions. Result: a list of rows with `date`, `amount`, `payee_name`, `category_name`, and `account_name`.
2. Filter rows to insurance payments by matching `payee_name` against insurer keywords (Geico, State Farm, Allstate, Progressive, USAA, Liberty Mutual, Nationwide, MetLife, Aetna, UnitedHealth, Cigna, Blue Cross, Kaiser, "insurance", "premium"), or by an Insurance `category_name`. Result: a filtered set of insurance rows.
3. Group the filtered rows by `payee_name` and classify each group into an insurance type:
   - Auto insurance
   - Health insurance (if paid directly, not employer-deducted)
   - Homeowners / Renters insurance
   - Life insurance
   - Disability insurance
   - Umbrella / Liability insurance
   - Pet insurance
   - Other
4. For each group, infer payment frequency from the spacing of the dates (monthly, quarterly, semi-annual, annual), then annualize the per-payment amount (amounts are already dollars — no conversion). Result: frequency and annual cost per type.
5. Present the insurance summary:

   ```
   INSURANCE AUDIT
   ══════════════════════════════════════════════════
   Type              Frequency    Payment    Annual
   ────────────────  ──────────   ────────   ────────
   Auto Insurance    Monthly      $145       $1,740
   Renters Ins.      Monthly      $18        $216
   Health (direct)   Monthly      $380       $4,560
   Life Insurance    Monthly      $42        $504
   ══════════════════════════════════════════════════
   TOTAL ANNUAL INSURANCE COST:              $7,020
   % of Annual Income:                       X.X%
   ```

   The *% of Annual Income* line needs annual income — get it from `budget_summary` (`monthBudget.income / 1000 × 12`) or ask the user; omit the line if neither is available.

6. Compare each line to typical cost ranges:
   - Auto: $1,400-$2,400/year (national average ~$1,900) depending on coverage, age, and location
   - Renters: $150-$300/year
   - Homeowners: $1,200-$2,500/year (varies heavily by location)
   - Term Life (30-year-old, $500k): $200-$500/year
7. Flag any insurance type significantly above its typical range. Result: a list of flagged policies (possibly empty).
8. Suggest action items for flagged lines: get comparison quotes, check for bundling discounts, review coverage levels and deductibles.

## Manual fallback (no YNAB)
1. Gather your insurance information from these sources:
   - Auto: check your insurer's portal or your most recent declaration page (mailed every 6 months). Companies: geico.com, progressive.com, statefarm.com.
   - Health: check your pay stub for employer-deducted premiums, or your marketplace account at healthcare.gov.
   - Homeowners/Renters: check your mortgage escrow statement or insurer portal. If you pay directly, search bank statements for the insurer name.
   - Life: check your insurer portal or search bank/credit card statements for the premium.
2. In a spreadsheet, list: Insurance Type, Provider, Annual Premium, Coverage Amount, Deductible.
3. Total the Annual Premium column: `=SUM(C2:C7)`.
4. Calculate insurance as a percentage of income: `=TotalPremiums / AnnualIncome * 100`.
5. Get comparison quotes:
   - Auto: thezebra.com, policygenius.com, or call your current insurer and ask about discounts.
   - Home/Renters: policygenius.com, lemonade.com.
   - Life: policygenius.com, havenlife.com, ladder.com.
6. Check for bundling: most insurers offer 5-15% discounts if you combine auto + home/renters.
7. Review deductibles: raising your auto deductible from $250 to $1,000 typically saves 15-30% on premiums. Only do this if you have enough in savings to cover the higher deductible.

## Notes
- Employer-subsidized health insurance premiums are deducted from your paycheck before it hits your bank account, so they will not appear in YNAB transaction data. Point the user to their pay stub to find that premium.
- Insurance costs vary dramatically by state, age, driving record, and credit score. National averages are rough benchmarks only.
- Do not drop coverage to save money without understanding the risk. Liability minimums are legal requirements, and going uninsured or underinsured can be financially catastrophic.
- Review insurance annually, especially after life changes: marriage, new home, new car, birth of a child.
