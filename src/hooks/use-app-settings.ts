import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  license_pva: string;
  npwp_number: string;
  shift_pagi_start: string;
  shift_pagi_end: string;
  shift_siang_start: string;
  shift_siang_end: string;
  prevent_oversell: boolean;
  transaction_threshold_usd: number;
}

const DEFAULT: AppSettings = {
  company_name: "KUPVA BB",
  company_address: "",
  company_phone: "",
  license_pva: "",
  npwp_number: "",
  shift_pagi_start: "08:00",
  shift_pagi_end: "15:00",
  shift_siang_start: "15:00",
  shift_siang_end: "22:00",
  prevent_oversell: false,
  transaction_threshold_usd: 10000,
};

let cache: AppSettings | null = null;
const listeners = new Set<(s: AppSettings) => void>();

async function fetchSettings(): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select(
      "company_name, company_address, company_phone, license_pva, npwp_number, shift_pagi_start, shift_pagi_end, shift_siang_start, shift_siang_end, prevent_oversell, transaction_threshold_usd",
    )
    .eq("id", true)
    .maybeSingle();
  const trim = (v: unknown) =>
    typeof v === "string" ? v.slice(0, 5) : undefined;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const next: AppSettings = {
    company_name: (data?.company_name as string) || DEFAULT.company_name,
    company_address: str((data as Record<string, unknown> | null)?.company_address),
    company_phone: str((data as Record<string, unknown> | null)?.company_phone),
    license_pva: str((data as Record<string, unknown> | null)?.license_pva),
    npwp_number: str((data as Record<string, unknown> | null)?.npwp_number),
    shift_pagi_start: trim(data?.shift_pagi_start) || DEFAULT.shift_pagi_start,
    shift_pagi_end: trim(data?.shift_pagi_end) || DEFAULT.shift_pagi_end,
    shift_siang_start:
      trim(data?.shift_siang_start) || DEFAULT.shift_siang_start,
    shift_siang_end: trim(data?.shift_siang_end) || DEFAULT.shift_siang_end,
    prevent_oversell: !!data?.prevent_oversell,
    transaction_threshold_usd: Number(data?.transaction_threshold_usd) || DEFAULT.transaction_threshold_usd,
  };
  cache = next;
  listeners.forEach((l) => l(next));
  return next;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(cache ?? DEFAULT);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    listeners.add(setSettings);
    if (cache === null) {
      fetchSettings().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      listeners.delete(setSettings);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSettings();
    setLoading(false);
  }, []);

  return { settings, loading, refresh };
}
