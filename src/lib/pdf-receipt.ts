import {
  receiptDoc,
  BRAND,
  fmtIDR,
  fmtNum,
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

  centered((r.company_name || BRAND.name).toUpperCase(), 8, true);
  centered("Authorized Money Changer", 6.8);
  centered("Jl Raya Uluwatu I 66 X Jimbaran, BALI", 5.8);
  centered("Telp/WA +62 812-4668-468", 5.8);
  centered("Izin KUPVA 23/34/KEP.GBI/Dpr/2021", 5.8);
  centered("NPWP:01.446.521.5-904.000", 5.8);
  y += 1;

  text(r.transaction_type === "buy" ? "Buying (BN)" : "Selling (JN)", left, 7.5, "left", true);
  text(`No:${r.transaction_no}`, right, 6.8, "right");
  y += 4;
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

  text("Currency;Amount", left, 7, "left", true);
  text("Rate", 48, 7, "right", true);
  text("TotalRp", right, 7, "right", true);
  y += 3.8;
  divider();

  text(r.currency.toUpperCase(), left, 7);
  text(fmtNum(r.foreign_amount, 2), 35, 7, "right");
  text("x", 38, 7);
  text(fmtNum(r.rate, 2), 54, 7, "right");
  text("=", 56, 7);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 7, "right");
  y += 4;
  text("0", 35, 7, "right");
  text("x", 38, 7);
  text("0,00", 54, 7, "right");
  text("=", 56, 7);
  text("0", right, 7, "right");
  y += 3.8;
  divider();

  text("Total Rp =", 49, 7.5, "right", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 7.5, "right", true);
  y += 5;
  text("(Rp)", left, 9, "left", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 9, "right", true);
  y += 5;
  divider();

  if (r.teller_name) detail("Operator", r.teller_name.toUpperCase());
  y += 7;
  centered(`( ${r.teller_name?.toUpperCase() || "CUSTOMER"} )   ( CASHIER )`, 6.2);
  y += 5;
  centered("Attention #", 6.2, true);
  centered("Claim for shortage of cash after leaving", 5.8);
  centered("out premises can not be considered", 5.8);

  openPdf(doc, `struk-${r.transaction_no}.pdf`);
}
