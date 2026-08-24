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

/** 80 mm thermal receipt layout, optimized for monospaced printer output. */
export function generateReceiptPdf(r: ReceiptData) {
  const doc = receiptDoc();
  const W = 80;
  const left = 4;
  const right = W - 4;
  let y = 6;

  const line = (text = "----------------------------------------") => {
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(45, 45, 45);
    doc.text(text, W / 2, y, { align: "center" });
    y += 3.4;
  };
  const centered = (text: string, size = 7, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(20, 20, 20);
    doc.text(text, W / 2, y, { align: "center" });
    y += size <= 6 ? 2.8 : 3.6;
  };
  const row = (label: string, value: string) => {
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(35, 35, 35);
    doc.text(label, left, y);
    doc.text(value, right, y, { align: "right" });
    y += 3.7;
  };

  centered((r.company_name || BRAND.name).toUpperCase(), 9, true);
  centered("AUTHORIZED MONEY CHANGER", 6.5);
  if (r.branch) centered(`${r.branch.code} / ${r.branch.name}`.toUpperCase(), 6.5);
  centered("Jl Raya Uluwatu I 66 X Jimbaran, BALI", 5.7);
  centered("Izin KUPVA BB | NPWP 01.446.521.5-904.000", 5.7);
  y += 1;
  line();

  centered(r.transaction_type === "buy" ? "BUYING (BN)" : "SELLING (JN)", 8, true);
  row("No", r.transaction_no);
  row("Date", fmtDateTime(r.transaction_date));
  row("Name", r.customer?.full_name || "WALK-IN CUSTOMER");
  if (r.customer?.customer_code) row("Customer ID", r.customer.customer_code);
  row("Payment", (r.payment_method || "cash").toUpperCase());
  y += 1;
  line();

  doc.setFont("courier", "bold");
  doc.setFontSize(6.8);
  doc.text("Currency/Amount", left, y);
  doc.text("Rate", 48, y, { align: "right" });
  doc.text("Total Rp", right, y, { align: "right" });
  y += 3.2;
  line();

  doc.setFont("courier", "normal");
  doc.setFontSize(7.2);
  doc.text(r.currency.toUpperCase(), left, y);
  doc.text(fmtNum(r.foreign_amount, 2), 38, y, { align: "right" });
  doc.text("x", 41, y);
  doc.text(fmtNum(r.rate, 2), 57, y, { align: "right" });
  doc.text("=", 59, y);
  doc.text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, y, { align: "right" });
  y += 4.5;
  doc.text("0", 38, y, { align: "right" });
  doc.text("x", 41, y);
  doc.text("0,00", 57, y, { align: "right" });
  doc.text("=", 59, y);
  doc.text("0", right, y, { align: "right" });
  y += 3.5;
  line();

  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.text(r.transaction_type === "buy" ? "Total Dibayar" : "Total Diterima", 18, y);
  doc.text(fmtIDR(r.idr_amount), right, y, { align: "right" });
  y += 5;
  doc.setFontSize(10);
  doc.text("( Rp )", left, y);
  doc.text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, y, { align: "right" });
  y += 4;
  line();

  if (r.teller_name) row("Operator", r.teller_name.toUpperCase());
  y += 4;
  centered("( CUSTOMER )     ( CASHIER )", 6.5);
  y += 4;
  centered("Attention #", 6, true);
  centered("Claim for shortage of cash after leaving", 5.7);
  centered("out premises can not be considered", 5.7);
  y += 2;
  centered("THANK YOU", 6.5, true);
  centered("Please keep this receipt as proof of transaction.", 5.5);

  openPdf(doc, `struk-${r.transaction_no}.pdf`);
}
