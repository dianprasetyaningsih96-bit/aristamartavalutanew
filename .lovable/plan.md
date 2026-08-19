# Plan: Display Previous Shift Balance

The user wants tellers to see the remaining balance from the previous morning shift when they are opening an afternoon shift.

## User Review Required
> [!IMPORTANT]
> - The balance displayed will be the **IDR** physical balance recorded when the last morning shift at that branch was closed.
> - If no morning shift was found for the current day, it will search for the most recent closed morning shift.

## Proposed Changes

### Frontend Improvements

#### 1. Enhance `OpenShiftDialog` in `src/routes/_authenticated/shifts.tsx`
- Add state to store the previous shift's closing balance.
- Add a `useEffect` to fetch the most recent closed "pagi" shift for the selected branch when `shiftType` is changed to "siang".
- Fetch data from `shifts` (to find the shift) and `shift_reconciliations` (to get the IDR balance).
- Display the found balance in the dialog UI when "Shif Siang/Sore" is selected.

### Technical Details
- Query the `shifts` table for the latest record where `branch_id = selectedBranch`, `shift_type = 'pagi'`, and `status = 'closed'`.
- Use the found `shift_id` to query `shift_reconciliations` for the row where `currency_id` matches the IDR currency.
- Use `Intl.NumberFormat('id-ID')` for formatting the displayed balance.
