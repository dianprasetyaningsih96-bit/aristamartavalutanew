-- Migration: Cleanup duplicate rows in transaction_items from re-running backfill

DELETE FROM public.transaction_items a
USING public.transaction_items b
WHERE a.id > b.id
  AND a.transaction_id = b.transaction_id
  AND a.currency_id = b.currency_id
  AND a.foreign_amount = b.foreign_amount
  AND a.rate = b.rate;
