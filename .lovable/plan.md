# Plan: Fix password change error

The "function gen_salt(unknown) does not exist" error occurs because the `pgcrypto` extension is either missing or not enabled in the current database schema when the `admin_change_password` function attempts to hash the new password.

## Proposed Changes

### Database Migration
- Enable the `pgcrypto` extension explicitly.
- Re-run the `admin_change_password` function definition to ensure it uses the enabled extension.

### Verification
- Check if the extension is enabled using SQL.
- Confirm the function can be called successfully by a Super Admin.

## Technical Details
- SQL: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- The `crypt` and `gen_salt` functions belong to the `pgcrypto` extension, which is standard in PostgreSQL/Supabase but requires activation.
