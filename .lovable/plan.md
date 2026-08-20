# Plan - Fix high-value transaction error (currency_code)

The user is experiencing a recurring error `record "new" has no field "currency_code"` during transactions over Rp 100 million for customer CUS-202608-0030. This is caused by database triggers (`notify_low_cash` or `notify_transaction_event`) referencing a non-existent column name or failing to handle missing data correctly.

## Proposed Changes

### Database Migrations

1. **Fix `notify_low_cash` trigger**:
   - Ensure it looks up the currency code from the `currencies` table instead of trying to access `NEW.currency_code` (which doesn't exist on `cash_balances`).

2. **Fix `notify_transaction_event` trigger**:
   - Verify it uses `NEW.transaction_no` instead of `NEW.transaction_number`.
   - Ensure the logic for identifying high-value transactions (>= 100M) is robust.

3. **Verify `check_transaction_threshold` RPC**:
   - Ensure it uses the correct column name `mid_rate` instead of `rate` for USD conversion.

### Frontend Adjustments

1. **Transaction Validation**:
   - Double-check the IDR amount calculation and CDD logic in `src/routes/_authenticated/transactions.tsx`.
   - Ensure the `up()` helper is correctly applied to all text inputs to maintain uppercase consistency.

## Technical Details

- The error `record "new" has no field "currency_code"` typically points to a trigger on a table that doesn't have that column (like `cash_balances` or `transactions`).
- I will create a consolidated migration to fix all related triggers.

## Verification Plan

- I will use a Playwright script to simulate a transaction > 100M for customer `CUS-202608-0030` and verify the success/failure state and console logs.
- I will check the database schema via `psql` or `supabase--read_query` to confirm column names.
