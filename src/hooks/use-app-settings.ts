import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  company_name: string;
}

const DEFAULT: AppSettings = { company_name: "KUPVA BB" };

let cache: AppSettings | null = null;
const listeners = new Set<(s: AppSettings) => void>();

async function fetchSettings(): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("company_name")
    .eq("id", true)
    .maybeSingle();
  const next: AppSettings = {
    company_name: (data?.company_name as string) || DEFAULT.company_name,
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