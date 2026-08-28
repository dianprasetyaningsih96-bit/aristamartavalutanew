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
  const left = 7;
  const right = width - 7;
  let y = 8;

  const text = (value: string, x: number, size = 7.5, align: "left" | "center" | "right" = "left", bold = false) => {
    // Built-in Courier avoids font substitution and keeps dot-matrix columns stable.
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(value, x, y, { align, renderingMode: "fill" });
  };
  const centered = (value: string, size = 7.5, bold = false) => {
    text(value, width / 2, size, "center", bold);
    y += 4.0;
  };
  const divider = () => {
    doc.setFont("courier", "normal");
    text("----------------------------------------", width / 2, 7, "center");
    y += 4.0;
  };
  const detail = (label: string, value: string) => {
    text(label, left, 7.5);
    text(":", left + 19, 7.5);
    text(value, left + 21, 7.5);
    y += 3.8;
  };

  centered((r.company_name || BRAND.name).toUpperCase(), 8.5, true);
  centered("AUTHORIZED MONEY CHANGER", 7.5);
  if (r.company_address) {
    for (const line of doc.splitTextToSize(r.company_address.toUpperCase(), width - 14) as string[]) {
      centered(line, 7.5);
    }
  }
  if (r.company_phone) centered(`TELP/WA ${r.company_phone}`, 7.5);
  if (r.license_pva) centered(`IZIN PVA ${r.license_pva}`, 7.5);
  if (r.npwp_number) centered(`NPWP:${r.npwp_number}`, 7.5);
  y += 1.5;

  text(r.transaction_type === "buy" ? "BUYING (BN)" : "SELLING (JN)", left, 7.5, "left", true);
  text(`NO:${r.transaction_no}`, right, 7.5, "right");
  y += 4.5;
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

  text("CURRENCY / AMOUNT    RATE       TOTAL RP", width / 2, 6.8, "center", true);
  y += 4.0;
  divider();

  const currStr = r.currency.toUpperCase();
  const fAmountStr = fmtNum(r.foreign_amount, 2);
  const rateStr = `x ${fmtNum(r.rate, 2)} =`;
  const idrStr = new Intl.NumberFormat("id-ID").format(Math.round(r.idr_amount));

  // Format a balanced 40-character line with centered alignment and safe margins
  const leftSide = `${currStr} ${fAmountStr}`;
  const rightSide = idrStr;
  const remaining = 40 - leftSide.length - rateStr.length - rightSide.length;
  const leftPad = Math.max(1, Math.floor(remaining / 2));
  const rightPad = Math.max(1, remaining - leftPad);
  const rowText = leftSide + " ".repeat(leftPad) + rateStr + " ".repeat(rightPad) + rightSide;

  text(rowText, width / 2, 6.8, "center", false);
  y += 4.2;
  divider();

  text("TOTAL RP =", right - doc.getTextWidth(idrStr) - 3, 7, "right", true);
  text(idrStr, right, 7, "right", true);
  y += 5.0;
  text("(RP)", left, 8, "left", true);
  text(idrStr, right, 8, "right", true);
  y += 5.0;
  divider();

  if (r.teller_name) detail("Operator", r.teller_name.toUpperCase());
  y += 8;
  centered(`( ${r.teller_name?.toUpperCase() || "CUSTOMER"} )   ( CASHIER )`, 7.5);
  y += 6;
  centered("ATTENTION #", 7.5, true);
  centered("Claim for shortage of cash after leaving", 7.5);
  centered("out premises can not be considered", 7.5);

  printPdf(doc, `struk-${r.transaction_no}.pdf`);
}
