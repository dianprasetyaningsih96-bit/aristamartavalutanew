-- Revoke execute from public/authenticated as per linter advice for security definer functions
-- These functions are called by triggers, so they don't need direct execute access from users.

REVOKE EXECUTE ON FUNCTION public.notify_low_cash() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_event() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_head_office_on_transfer() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_customer_to_dttot() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_dttot_to_customer() FROM PUBLIC, authenticated;

-- Ensure service_role can still execute them
GRANT EXECUTE ON FUNCTION public.notify_low_cash() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_transaction_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_head_office_on_transfer() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_customer_to_dttot() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_dttot_to_customer() TO service_role;
