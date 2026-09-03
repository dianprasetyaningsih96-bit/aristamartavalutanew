import { supabase } from "@/integrations/supabase/client";

export interface DttotMatchResult {
  isMatch: boolean;
  matchType?: "identity_number" | "notes_identity" | "full_name" | "alias";
  matchedEntry?: {
    id: string;
    reference_code: string | null;
    full_name: string;
    aliases: string | null;
    identity_number: string | null;
    notes: string | null;
  };
  reason?: string;
}

/**
 * Melakukan screening nasabah terhadap daftar DTTOT (Daftar Terduga Teroris & Organisasi Teroris)
 * Memeriksa kesesuaian:
 * 1. Nomor Identitas (NIK, Paspor, Kartu Identitas Nasional Asing) baik di kolom identity_number maupun catatan (notes)
 * 2. Nama Lengkap dan Nama Alias
 */
export async function screenAgainstDttot(
  fullName?: string | null,
  idNumber?: string | null
): Promise<DttotMatchResult> {
  const rawCustName = (fullName || "").trim().toLowerCase();
  const cleanCustName = rawCustName.replace(/[^a-z0-9]/g, "");
  const rawCustId = (idNumber || "").trim().toLowerCase();
  const cleanCustId = rawCustId.replace(/[^a-z0-9]/g, "");

  if (!cleanCustName && !cleanCustId) {
    return { isMatch: false };
  }

  try {
    const { data: entries, error } = await supabase
      .from("dttot_list")
      .select("id, reference_code, full_name, aliases, identity_number, notes")
      .eq("is_active", true);

    if (error || !entries) {
      console.warn("DTTOT screening query error:", error);
      return { isMatch: false };
    }

    for (const dt of entries) {
      const dtName = (dt.full_name || "").trim().toLowerCase();
      const cleanDtName = dtName.replace(/[^a-z0-9]/g, "");
      const dtAliases = (dt.aliases || "").toLowerCase();
      const cleanDtAliases = dtAliases.replace(/[^a-z0-9]/g, "");
      const rawDtIds = (dt.identity_number || "").toLowerCase();
      const cleanDtIds = rawDtIds.replace(/[^a-z0-9]/g, "");
      const rawDtNotes = (dt.notes || "").toLowerCase();
      const cleanDtNotes = rawDtNotes.replace(/[^a-z0-9]/g, "");

      // 1. Cek nomor identitas (NIK / Paspor / No ID Nasional / Kartu Identitas Nasional Prancis seperti 070275Q007873)
      if (cleanCustId && cleanCustId.length >= 5) {
        // Cek langsung pada kolom identity_number
        if (cleanDtIds && (cleanDtIds === cleanCustId || cleanDtIds.includes(cleanCustId) || cleanCustId.includes(cleanDtIds))) {
          return {
            isMatch: true,
            matchType: "identity_number",
            matchedEntry: dt,
            reason: `Nomor identitas cocok dengan data DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
        if (rawDtIds.includes(rawCustId)) {
          return {
            isMatch: true,
            matchType: "identity_number",
            matchedEntry: dt,
            reason: `Nomor identitas cocok dengan data DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }

        // Cek pada kolom Catatan (notes)
        // Contoh: "Kartu identitas nasional Prancis 070275Q007873"
        if (cleanDtNotes && cleanDtNotes.includes(cleanCustId)) {
          return {
            isMatch: true,
            matchType: "notes_identity",
            matchedEntry: dt,
            reason: `Nomor identitas teridentifikasi di catatan DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
        if (rawDtNotes.includes(rawCustId)) {
          return {
            isMatch: true,
            matchType: "notes_identity",
            matchedEntry: dt,
            reason: `Nomor identitas teridentifikasi di catatan DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
      }

      // 2. Cek nama lengkap dan alias
      if (cleanCustName && cleanCustName.length >= 3) {
        if (cleanCustName === cleanDtName) {
          return {
            isMatch: true,
            matchType: "full_name",
            matchedEntry: dt,
            reason: `Nama lengkap sama persis dengan DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
        if (cleanCustName.length >= 5 && (cleanDtName.includes(cleanCustName) || cleanCustName.includes(cleanDtName))) {
          return {
            isMatch: true,
            matchType: "full_name",
            matchedEntry: dt,
            reason: `Nama lengkap cocok dengan entri DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
        if (cleanDtAliases && cleanDtAliases.includes(cleanCustName)) {
          return {
            isMatch: true,
            matchType: "alias",
            matchedEntry: dt,
            reason: `Nama lengkap cocok dengan alias DTTOT: ${dt.full_name} (${dt.reference_code || "DTTOT"})`,
          };
        }
      }
    }

    return { isMatch: false };
  } catch (err) {
    console.error("DTTOT screening error:", err);
    return { isMatch: false };
  }
}
