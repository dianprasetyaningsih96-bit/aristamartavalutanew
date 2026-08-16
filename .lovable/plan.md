# LKUB Report Logic and Calculation Fixes

Improve the Monthly Business Activity Report (LKUB) by implementing correct opening/closing balance logic, dynamic IDR valuations using Mid-Rates, and proper currency formatting.

## Proposed Changes

### Database & Backend
- **Monthly Balances Table**: Create `monthly_balances` to track "Saldo Awal" (Foreign & IDR historical cost) per branch and currency.
- **SQL Function**: Add a server-side helper to fetch combined transaction volumes and opening balances for a given month.

### Frontend (Reports Page)
- **Data Integration**:
    - Fetch opening balances from `monthly_balances`.
    - Calculate `Saldo Akhir (Valas) = Saldo Awal (Valas) + Volume Beli (Valas) - Volume Jual (Valas)`.
    - Calculate `Saldo Akhir (Rp) = Saldo Akhir (Valas) * Kurs Tengah`.
- **Formatting**:
    - Update `fmtNum` to ensure two decimal places for foreign currency volumes.
    - Update `fmtIDR` to ensure clean thousands separators.
- **UI Updates**:
    - Populate all columns in the LKUB table (Saldo Awal, Saldo Akhir).
    - Add a "Set Saldo Awal" mechanism (or automated carry-over logic) for Super Admins.

### PDF & Export
- **PDF Generation**: Update `generateLkubReportPdf` in `src/lib/pdf-reports.ts` to include the calculated balances and correct column headers.
- **CSV Export**: Update `exportLkubCSV` in `src/routes/_authenticated/reports.tsx` to match the new data structure.

## Technical Details
- **Table**: `public.monthly_balances` (`branch_id`, `currency_id`, `period_month`, `opening_balance_foreign`, `opening_balance_idr`).
- **Rounding**: Use standard IDR rounding for IDR columns and 2 decimal places for foreign currency (standard KUPVA BB requirement).
