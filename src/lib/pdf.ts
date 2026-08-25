import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export const BRAND = {
  name: "KUPVA BB",
  subtitle: "Money Changer — Bukan Bank",
  primary: [6, 78, 59] as [number, number, number], // emerald 900
  accent: [16, 185, 129] as [number, number, number], // emerald 500
  muted: [100, 116, 139] as [number, number, number], // slate 500
  line: [226, 232, 240] as [number, number, number], // slate 200
};

export function fmtIDR(n: number) {
  return "Rp " + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(n));
}
export function fmtNum(n: number, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
export function fmtDateTime(s: string | Date) {
  return new Date(s).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Draws branded header block. Returns Y position after header. */
export function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
): number {
  const w = doc.internal.pageSize.getWidth();
  // top emerald band
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, w, 18, "F");
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 18, w, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(BRAND.name, 12, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(BRAND.subtitle, 12, 15.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 12, 11, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(subtitle, w - 12, 15.5, { align: "right" });
  }

  doc.setTextColor(15, 23, 42);
  return 26;
}

export function drawFooter(doc: jsPDF, extra?: string) {
  const pageCount = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.line(12, h - 12, w - 12, h - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      `Dicetak: ${new Date().toLocaleString("id-ID")}${extra ? " · " + extra : ""}`,
      12,
      h - 7,
    );
    doc.text(`Halaman ${i} / ${pageCount}`, w - 12, h - 7, { align: "right" });
  }
}

export function landscapeDoc() {
  return new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
}
export function portraitDoc() {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

export function receiptDoc() {
  // Fixed 76 × 297mm page for dot-matrix printers; built-in fonts avoid substitution blur.
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [76, 297],
    precision: 4,
    compress: true,
    putOnlyUsedFonts: true,
  });
}

export function table(doc: jsPDF, opts: UserOptions) {
  autoTable(doc, {
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.6 },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    ...opts,
  });
}

export function openPdf(doc: jsPDF, filename: string) {
  // Open in new tab so the user gets browser print/save UX
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) doc.save(filename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function savePdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/**
 * Kirim PDF langsung ke dialog printer tanpa membuka tab preview.
 * Dengan Chrome mode --kiosk-printing, dialog pun tidak muncul (cetak otomatis).
 */
export function printPdf(doc: jsPDF, filename: string) {
  if (typeof window === "undefined") return;
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    let done = false;
    const cleanup = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 60_000);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("no iframe window");
        win.focus();
        win.print();
        done = true;
        cleanup();
      } catch {
        iframe.remove();
        URL.revokeObjectURL(url);
        openPdf(doc, filename);
      }
    };

    document.body.appendChild(iframe);
    iframe.src = url;

    // Fallback bila iframe PDF diblokir / tidak pernah load
    setTimeout(() => {
      if (!done) {
        iframe.remove();
        URL.revokeObjectURL(url);
        openPdf(doc, filename);
      }
    }, 4000);
  } catch {
    openPdf(doc, filename);
  }
}
