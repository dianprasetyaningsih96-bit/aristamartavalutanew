import {
  receiptDoc,
  BRAND,
  fmtIDR,
  fmtNum,
  fmtDateTime,
  openPdf,
} from "./pdf";

export interface ReceiptData {
  transaction_no: string;
  transaction_date: string;
  transaction_type: "buy" | "sell";
  branch?: { code: string; name: string } | null;
  customer?: { customer_code: string; full_name: string } | null;
  currency: string;
  foreign_amount: number;
  rate: number;
  idr_amount: number;
  payment_method?: string;
  teller_name?: string;
  company_name?: string;
}

export function generateReceiptPdf(r: ReceiptData) {
  const doc = receiptDoc();
  const W = 80;
  let y = 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text(r.company_name || BRAND.name, W / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(BRAND.subtitle, W / 2, y, { align: "center" });
  y += 3;
  if (r.branch) {
    doc.text(`${r.branch.code} · ${r.branch.name}`, W / 2, y, {
      align: "center",
    });
    y += 3;
  }

  y += 1;
  doc.setDrawColor(...BRAND.line);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, W - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("STRUK TRANSAKSI", W / 2, y, { align: "center" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    r.transaction_type === "buy" ? "BELI VALAS (Nasabah -> Kas)" : "JUAL VALAS (Kas -> Nasabah)",
    W / 2,
    y,
    { align: "center" },
  );
  y += 4;

  const rows: [string, string][] = [
    ["No. Trx", r.transaction_no],
    ["Tanggal", fmtDateTime(r.transaction_date)],
    ["Nasabah", r.customer ? `${r.customer.customer_code} · ${r.customer.full_name}` : "Walk-in"],
    ["Mata Uang", r.currency],
    ["Nominal Valas", fmtNum(r.foreign_amount)],
    ["Kurs", fmtNum(r.rate, 4)],
    ["Metode Bayar", (r.payment_method ?? "cash").toUpperCase()],
  ];
  doc.setFontSize(8);
  for (const [k, v] of rows) {
    doc.setTextColor(...BRAND.muted);
    doc.text(k, 4, y);
    doc.setTextColor(15, 23, 42);
    doc.text(v, W - 4, y, { align: "right" });
    y += 4;
  }

  y += 1;
  doc.setDrawColor(...BRAND.line);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, W - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.primary);
  doc.text(r.transaction_type === "buy" ? "TOTAL DIBAYAR" : "TOTAL DITERIMA", 4, y);
  doc.text(fmtIDR(r.idr_amount), W - 4, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.muted);
  if (r.teller_name) {
    doc.text(`Teller: ${r.teller_name}`, 4, y);
    y += 3;
  }
  doc.text(
    "Simpan struk ini sebagai bukti transaksi.",
    W / 2,
    y,
    { align: "center" },
  );
  y += 3;
  doc.text(
    "Terima kasih atas kepercayaan Anda.",
    W / 2,
    y,
    { align: "center" },
  );
  y += 4;

  doc.setFontSize(6);
  doc.text(
    "Kegiatan Usaha Penukaran Valuta Asing Bukan Bank (KUPVA BB)",
    W / 2,
    y,
    { align: "center" },
  );

  openPdf(doc, `struk-${r.transaction_no}.pdf`);
}
