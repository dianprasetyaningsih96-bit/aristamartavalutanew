import {
  receiptDoc,
  BRAND,
  fmtNum,
  printPdf,
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
  company_address?: string;
  company_phone?: string;
  license_pva?: string;
  npwp_number?: string;
}

function receiptDate(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 76 × 297mm dot-matrix receipt with a printer-safe monospaced layout. */
export function generateReceiptPdf(r: ReceiptData) {
  const doc = receiptDoc();
  const width = 76;
  const left = 5;
  const right = width - 5;
  let y = 8;

  const text = (value: string, x: number, size = 8, align: "left" | "center" | "right" = "left", bold = false) => {
    // Built-in Courier avoids font substitution and keeps dot-matrix columns stable.
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(Math.max(size, 8));
    doc.setTextColor(0, 0, 0);
    doc.text(value, x, y, { align, renderingMode: "fill" });
  };
  const centered = (value: string, size = 8, bold = false) => {
    text(value, width / 2, size, "center", bold);
    y += 4.4;
  };
  const divider = () => {
    text("------------------------------------", width / 2, 8, "center", true);
    y += 4.4;
  };
  const detail = (label: string, value: string) => {
    text(label, left, 8);
    text(":", 24, 8);
    text(value, 27, 8);
    y += 4.2;
  };

  centered((r.company_name || BRAND.name).toUpperCase(), 9, true);
  centered("AUTHORIZED MONEY CHANGER", 8);
  if (r.company_address) {
    for (const line of doc.splitTextToSize(r.company_address.toUpperCase(), width - 8) as string[]) {
      centered(line, 8);
    }
  }
  if (r.company_phone) centered(`TELP/WA ${r.company_phone}`, 8);
  if (r.license_pva) centered(`IZIN PVA ${r.license_pva}`, 8);
  if (r.npwp_number) centered(`NPWP:${r.npwp_number}`, 8);
  y += 1.5;

  text(r.transaction_type === "buy" ? "BUYING (BN)" : "SELLING (JN)", left, 8, "left", true);
  text(`NO:${r.transaction_no}`, right, 8, "right");
  y += 5;
  divider();

  detail("Date", receiptDate(r.transaction_date));
  detail("Name", (r.customer?.full_name || "WALK-IN CUSTOMER").toUpperCase());
  detail("ID/KTP", r.customer?.customer_code || "-");
  detail("Nationality", "-");
  detail("Occupation", "-");
  detail("DateBirth", "-");
  detail("PlaceBirth", "-");
  detail("Pay type", (r.payment_method || "Cash").toUpperCase());
  detail("Outlet/DC", (r.branch?.name || r.branch?.code || "-").toUpperCase());
  detail("Objective", "CURRENCY EXCHANGE");
  y += 1;
  divider();

  text("CURRENCY / AMOUNT", left, 8, "left", true);
  text("RATE", 48, 8, "right", true);
  text("TOTAL RP", right, 8, "right", true);
  y += 4.4;
  divider();

  text(r.currency.toUpperCase(), left, 8);
  text(fmtNum(r.foreign_amount, 2), 35, 8, "right");
  text("x", 38, 8);
  text(fmtNum(r.rate, 2), 54, 8, "right");
  text("=", 56, 8);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 8, "right");
  y += 4.8;
  text("0", 35, 8, "right");
  text("x", 38, 8);
  text("0,00", 54, 8, "right");
  text("=", 56, 8);
  text("0", right, 8, "right");
  y += 4.4;
  divider();

  text("TOTAL RP =", 49, 8, "right", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 8, "right", true);
  y += 6;
  text("(RP)", left, 9, "left", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 9, "right", true);
  y += 6;
  divider();

  if (r.teller_name) detail("Operator", r.teller_name.toUpperCase());
  y += 8;
  centered(`( ${r.teller_name?.toUpperCase() || "CUSTOMER"} )   ( CASHIER )`, 8);
  y += 6;
  centered("ATTENTION #", 8, true);
  centered("Claim for shortage of cash after leaving", 8);
  centered("out premises can not be considered", 8);

  printPdf(doc, `struk-${r.transaction_no}.pdf`);
}
