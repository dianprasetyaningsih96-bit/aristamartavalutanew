import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  company_name: string;
  shift_pagi_start: string;
  shift_pagi_end: string;
  shift_siang_start: string;
  shift_siang_end: string;
  prevent_oversell: boolean;
}

const DEFAULT: AppSettings = {
  company_name: "KUPVA BB",
  shift_pagi_start: "08:00",
  shift_pagi_end: "15:00",
  shift_siang_start: "15:00",
  shift_siang_end: "22:00",
  prevent_oversell: false,
};

let cache: AppSettings | null = null;
const listeners = new Set<(s: AppSettings) => void>();

async function fetchSettings(): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select(
      "company_name, shift_pagi_start, shift_pagi_end, shift_siang_start, shift_siang_end, prevent_oversell",
    )
    .eq("id", true)
    .maybeSingle();
  const trim = (v: unknown) =>
    typeof v === "string" ? v.slice(0, 5) : undefined;
  const next: AppSettings = {
    company_name: (data?.company_name as string) || DEFAULT.company_name,
    shift_pagi_start: trim(data?.shift_pagi_start) || DEFAULT.shift_pagi_start,
    shift_pagi_end: trim(data?.shift_pagi_end) || DEFAULT.shift_pagi_end,
    shift_siang_start:
      trim(data?.shift_siang_start) || DEFAULT.shift_siang_start,
    shift_siang_end: trim(data?.shift_siang_end) || DEFAULT.shift_siang_end,
    prevent_oversell: !!data?.prevent_oversell,
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