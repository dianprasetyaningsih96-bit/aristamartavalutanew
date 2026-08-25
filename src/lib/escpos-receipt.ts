import type { ReceiptData } from "./pdf-receipt";

/** ESC/POS command bytes (Epson TM-U220 compatible). */
export const ESC_POS = {
  INIT: [0x1b, 0x40],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  LF: [0x0a],
  CUT: [0x1d, 0x56, 0x00],
} as const;

const COLS = 40; // 76mm / Font A pada TM-U220

const enc = new TextEncoder();

class EscPosBuilder {
  private parts: number[] = [];

  raw(bytes: readonly number[]) {
    this.parts.push(...bytes);
    return this;
  }

  text(value: string) {
    this.parts.push(...enc.encode(value));
    return this;
  }

  line(value = "") {
    return this.text(value).raw(ESC_POS.LF);
  }

  center(value: string, bold = false) {
    this.raw(ESC_POS.ALIGN_CENTER);
    if (bold) this.raw(ESC_POS.BOLD_ON);
    this.line(value);
    if (bold) this.raw(ESC_POS.BOLD_OFF);
    return this.raw(ESC_POS.ALIGN_LEFT);
  }

  /** Baris dua kolom dengan padding monospace agar rata kiri-kanan. */
  pair(label: string, value: string) {
    const space = Math.max(1, COLS - label.length - value.length);
    return this.line(`${label}${" ".repeat(space)}${value}`);
  }

  divider(char = "-") {
    return this.line(char.repeat(COLS));
  }

  build() {
    return new Uint8Array(this.parts);
  }
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtVal = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function receiptDate(value: string) {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Susun byte array ESC/POS dari data transaksi. */
export function buildReceiptBytes(r: ReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  const isBuy = r.transaction_type === "buy";

  b.raw(ESC_POS.INIT)
    .center((r.company_name || "MONEY CHANGER").toUpperCase(), true)
    .center("PEDAGANG VALUTA ASING BERIZIN")
    .center(r.branch ? `${r.branch.code} - ${r.branch.name}`.toUpperCase() : "-")
    .divider("=")
    .center(isBuy ? "STRUK PEMBELIAN VALAS" : "STRUK PENJUALAN VALAS", true)
    .divider("=")
    .pair("NO. TRANSAKSI", r.transaction_no)
    .pair("TANGGAL", receiptDate(r.transaction_date))
    .pair("NASABAH", (r.customer?.full_name ?? "-").toUpperCase().slice(0, 22))
    .pair("KODE NASABAH", r.customer?.customer_code ?? "-")
    .divider()
    .pair("MATA UANG", r.currency)
    .pair("NOMINAL VALAS", fmtVal(r.foreign_amount))
    .pair("KURS", `Rp ${fmtIDR(r.rate)}`)
    .divider();

  b.raw(ESC_POS.BOLD_ON).pair("TOTAL RUPIAH", `Rp ${fmtIDR(r.idr_amount)}`).raw(ESC_POS.BOLD_OFF);

  b.divider()
    .pair("PEMBAYARAN", (r.payment_method ?? "-").toUpperCase())
    .pair("PETUGAS", (r.teller_name ?? "-").toUpperCase().slice(0, 22))
    .line()
    .center("TERIMA KASIH ATAS KUNJUNGAN ANDA")
    .center("STRUK INI BUKTI TRANSAKSI YANG SAH")
    .line()
    .line()
    .pair("      NASABAH", "PETUGAS      ")
    .line()
    .line()
    .line()
    .pair("  (            )", "(            )  ")
    .line()
    .line()
    .line()
    .raw(ESC_POS.CUT);

  return b.build();
}

export class PrinterError extends Error {}

/** Cetak langsung ke printer USB/serial (Epson TM-U220) via Web Serial API. */
export async function printReceiptViaSerial(
  data: ReceiptData,
  baudRates: number[] = [9600, 19200],
): Promise<void> {
  const nav = navigator as Navigator & { serial?: any };
  if (!nav.serial) {
    throw new PrinterError(
      "Browser tidak mendukung Web Serial API. Gunakan Chrome/Edge terbaru di desktop.",
    );
  }

  let port: any;
  try {
    const ports = await nav.serial.getPorts();
    port = ports[0] ?? (await nav.serial.requestPort());
  } catch {
    throw new PrinterError("Printer tidak terdeteksi");
  }
  if (!port) throw new PrinterError("Printer tidak terdeteksi");

  const bytes = buildReceiptBytes(data);
  let lastError: unknown = null;

  for (const baudRate of baudRates) {
    try {
      await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none" });
      const writer = port.writable.getWriter();
      try {
        await writer.write(bytes);
      } finally {
        writer.releaseLock();
        await port.close();
      }
      return;
    } catch (err) {
      lastError = err;
      try {
        await port.close();
      } catch {
        /* port belum terbuka */
      }
    }
  }

  throw new PrinterError(
    `Gagal mencetak struk: ${lastError instanceof Error ? lastError.message : "kesalahan tidak diketahui"}`,
  );
}
