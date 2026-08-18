/** Utilities to enforce ALL-CAPS data entry (KYC & transaksi). */

/** Uppercase a value, preserving null/empty as null. */
export function up(v: unknown): string | null {
  if (typeof v !== "string") return (v as string | null) ?? null;
  const t = v.trim().toUpperCase();
  return t === "" ? null : t;
}

/** Uppercase a value, always returning a string (for required fields). */
export function upReq(v: string): string {
  return v.trim().toUpperCase();
}

/**
 * Tailwind classes that render typed text in uppercase for inputs/textareas
 * inside the wrapped container (placeholders stay in normal case).
 */
export const UPPERCASE_FORM =
  "[&_input:not([type=email]):not([type=date]):not([type=password]):not([type=number])]:uppercase [&_textarea]:uppercase [&_input]:placeholder:normal-case [&_textarea]:placeholder:normal-case";
