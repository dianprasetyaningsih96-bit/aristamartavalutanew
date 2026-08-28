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

/** Kirim PDF langsung ke dialog printer tanpa membuka pratinjau. */
export function printPdf(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = url;
    frame.onload = () => {
      try {
        const win = frame.contentWindow;
        if (!win) throw new Error("no frame window");
        win.focus();
        win.print();
      } catch {
        doc.save(filename);
      }
      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };
    document.body.appendChild(frame);
  } catch {
    doc.save(filename);
  }
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
