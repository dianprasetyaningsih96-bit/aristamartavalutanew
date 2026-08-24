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

/** 80mm thermal receipt, using the compact monospaced layout from the reference. */
export function generateReceiptPdf(r: ReceiptData) {
  const doc = receiptDoc();
  const width = 80;
  const left = 5;
  const right = width - 5;
  let y = 7;

  const text = (value: string, x: number, size = 7, align: "left" | "center" | "right" = "left", bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(35, 35, 35);
    doc.text(value, x, y, { align });
  };
  const centered = (value: string, size = 7, bold = false) => {
    text(value, width / 2, size, "center", bold);
    y += size <= 6 ? 2.8 : 3.7;
  };
  const divider = () => {
    text("------------------------------------------", width / 2, 6.5, "center");
    y += 3.8;
  };
  const detail = (label: string, value: string) => {
    text(label, left, 7);
    text(":", 24, 7);
    text(value, 27, 7);
    y += 3.6;
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

  text("Currency;Amount", left, 6.8, "left", true);
  text("Rate", 51, 6.8, "right", true);
  text("TotalRp", right, 6.8, "right", true);
  y += 3.8;
  divider();

  text(r.currency.toUpperCase(), left, 7);
  text(fmtNum(r.foreign_amount, 2), 38, 7, "right");
  text("x", 41, 7);
  text(fmtNum(r.rate, 2), 57, 7, "right");
  text("=", 59, 7);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 7, "right");
  y += 4;
  text("0", 38, 7, "right");
  text("x", 41, 7);
  text("0,00", 57, 7, "right");
  text("=", 59, 7);
  text("0", right, 7, "right");
  y += 3.8;
  divider();

  text("Total Rp =", 52, 7.5, "right", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 7.5, "right", true);
  y += 5;
  text("(Rp)", left, 9, "left", true);
  text(new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount)), right, 9, "right", true);
  y += 5;
  divider();

  if (r.teller_name) detail("Operator", r.teller_name.toUpperCase());
  y += 7;
  centered(`( ${r.teller_name?.toUpperCase() || "CUSTOMER"} )     ( CASHIER )`, 6.2);
  y += 5;
  centered("Attention #", 6.2, true);
  centered("Claim for shortage of cash after leaving", 5.8);
  centered("out premises can not be considered", 5.8);

  openPdf(doc, `struk-${r.transaction_no}.pdf`);
}
