import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { up, UPPERCASE_FORM } from "@/lib/text-case";
import { CustomerForm } from "@/components/customers/customer-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerOpt {
  id: string;
  customer_code: string;
  full_name: string;
  risk_rating: string;
  kyc_status: string;
  is_blacklisted: boolean;
  blacklist_reason?: string | null;
}

interface CurrencyOpt {
  id: string;
  code: string;
  name: string;
}

interface RateRow {
  currency_id: string;
  branch_id: string | null;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
  customers: CustomerOpt[];
  currencies: CurrencyOpt[];
  rates: RateRow[];
  onReloadCustomers: () => void;
  onSaved: () => void;
}

interface EditCurrencyItem {
  id: string;
  currency_id: string;
  foreign_amount: number;
  rate: number;
  foreignInput: string;
  rateInput: string;
}

const NO_CUSTOMER = "__walkin__";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number, d = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

function toLocalDatetimeString(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  customers,
  currencies,
  rates,
  onReloadCustomers,
  onSaved,
}: EditTransactionDialogProps) {
  const [dateTime, setDateTime] = useState<string>("");
  const [previewTxNo, setPreviewTxNo] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>(NO_CUSTOMER);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<EditCurrencyItem[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form state whenever transaction changes
  useEffect(() => {
    if (transaction && open) {
      const localDt = toLocalDatetimeString(transaction.transaction_date);
      setDateTime(localDt);
      setPreviewTxNo(transaction.transaction_no || "");
      setCustomerId(transaction.customer_id || NO_CUSTOMER);
      setPaymentMethod(transaction.payment_method || "cash");
      setNotes(transaction.notes || "");
      setShowAddCustomer(false);

      if (transaction.transaction_items && transaction.transaction_items.length > 0) {
        setItems(
          transaction.transaction_items.map((ti: any) => ({
            id: ti.id || Math.random().toString(36).substring(2, 9),
            currency_id: ti.currency_id,
            foreign_amount: Number(ti.foreign_amount || 0),
            rate: Number(ti.rate || 0),
            foreignInput: fmtNum(Number(ti.foreign_amount || 0), 0),
            rateInput: fmtNum(Number(ti.rate || 0), 0),
          }))
        );
      } else {
        const initialCurr = transaction.currency_id || currencies[0]?.id || "";
        setItems([
          {
            id: Math.random().toString(36).substring(2, 9),
            currency_id: initialCurr,
            foreign_amount: Number(transaction.foreign_amount || 0),
            rate: Number(transaction.rate || 0),
            foreignInput: fmtNum(Number(transaction.foreign_amount || 0), 0),
            rateInput: fmtNum(Number(transaction.rate || 0), 0),
          },
        ]);
      }
    }
  }, [transaction, open, currencies]);

  // Live preview transaction number when date/time changes
  const handleDateChange = async (newVal: string) => {
    setDateTime(newVal);
    if (!newVal || !transaction) return;

    const dateObj = new Date(newVal);
    if (isNaN(dateObj.getTime())) return;

    // Speculative fast client-side preview
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}`;
    const basePrefix = transaction.transaction_no
      ? transaction.transaction_no.substring(0, 6)
      : "AMVJ1-";
    const speculativePrefix = `${basePrefix}${dateStr}-`;

    // Query exact sequence from server
    try {
      const { data, error } = await supabase.rpc("preview_transaction_no", {
        _transaction_id: transaction.id,
        _new_date: dateObj.toISOString(),
      });
      if (!error && data) {
        setPreviewTxNo(data);
      } else {
        setPreviewTxNo(`${speculativePrefix}...`);
      }
    } catch {
      setPreviewTxNo(`${speculativePrefix}...`);
    }
  };

  const getSuggestedRate = (currId: string) => {
    if (!currId || !transaction) return 0;
    const bId = transaction.branch_id ?? null;
    const match =
      rates.find((r) => r.currency_id === currId && r.branch_id === bId) ||
      rates.find((r) => r.currency_id === currId && r.branch_id === null);
    if (!match) return 0;
    return transaction.transaction_type === "buy"
      ? Number(match.buy_rate)
      : Number(match.sell_rate);
  };

  const handleCurrencyChange = (index: number, newCurrId: string) => {
    setItems((prev) => {
      const next = [...prev];
      const suggested = getSuggestedRate(newCurrId);
      next[index] = {
        ...next[index],
        currency_id: newCurrId,
        rate: suggested > 0 ? suggested : next[index].rate,
        rateInput: suggested > 0 ? fmtNum(suggested, 0) : next[index].rateInput,
      };
      return next;
    });
  };

  const handleForeignChange = (index: number, val: string) => {
    const clean = val.replace(/[^\d,\.]/g, "");
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized) || 0;
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        foreignInput: clean,
        foreign_amount: num,
      };
      return next;
    });
  };

  const handleForeignBlur = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const it = next[index];
      if (it && it.foreign_amount > 0) {
        next[index] = {
          ...it,
          foreignInput: new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 5,
          }).format(it.foreign_amount),
        };
      }
      return next;
    });
  };

  const handleRateChange = (index: number, val: string) => {
    const clean = val.replace(/[^\d,\.]/g, "");
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized) || 0;
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        rateInput: clean,
        rate: num,
      };
      return next;
    });
  };

  const handleRateBlur = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const it = next[index];
      if (it && it.rate > 0) {
        next[index] = {
          ...it,
          rateInput: fmtNum(it.rate, 0),
        };
      }
      return next;
    });
  };

  const handleAddItem = () => {
    const defaultCurr = currencies[0]?.id || "";
    const suggested = getSuggestedRate(defaultCurr);
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        currency_id: defaultCurr,
        foreign_amount: 0,
        rate: suggested,
        foreignInput: "",
        rateInput: suggested > 0 ? fmtNum(suggested, 0) : "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAkhir = useMemo(() => {
    return items.reduce((acc, it) => {
      const sub = Number((it.rate * it.foreign_amount).toFixed(2));
      return acc + (isNaN(sub) ? 0 : sub);
    }, 0);
  }, [items]);

  const selectedCust = customers.find((c) => c.id === customerId);
  const blacklistBlock = selectedCust?.is_blacklisted;

  async function handleSave() {
    if (!transaction) return;

    if (items.length === 0) {
      toast.error("Minimal harus ada 1 mata uang");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.currency_id) {
        toast.error(`Baris ke-${i + 1}: Pilih mata uang terlebih dahulu`);
        return;
      }
      if (!it.foreign_amount || it.foreign_amount <= 0) {
        toast.error(`Baris ke-${i + 1}: Nominal valas harus lebih besar dari 0`);
        return;
      }
      if (!it.rate || it.rate <= 0) {
        toast.error(`Baris ke-${i + 1}: Kurs harus lebih besar dari 0`);
        return;
      }
    }

    setSaving(true);
    const payloadItems = items.map((it) => ({
      currency_id: it.currency_id,
      foreign_amount: it.foreign_amount,
      rate: it.rate,
      idr_amount: Number((it.foreign_amount * it.rate).toFixed(2)),
    }));

    const targetDate = dateTime
      ? new Date(dateTime).toISOString()
      : transaction.transaction_date;

    const { data: res, error } = await supabase.rpc("admin_update_transaction", {
      _transaction_id: transaction.id,
      _customer_id: customerId === NO_CUSTOMER ? null : customerId,
      _payment_method: paymentMethod,
      _notes: up(notes) || null,
      _transaction_date: targetDate,
      _items: payloadItems,
    });

    setSaving(false);

    if (error) {
      toast.error("Gagal memperbarui transaksi", { description: error.message });
      return;
    }

    const updatedNo = (res as any)?.transaction_no || previewTxNo || transaction.transaction_no;
    toast.success("Transaksi berhasil diperbarui", {
      description: `Nomor transaksi: ${updatedNo}`,
    });
    onSaved();
    onOpenChange(false);
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-2xl max-h-[92vh] overflow-y-auto ${UPPERCASE_FORM}`}
      >
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Transaksi {previewTxNo || transaction.transaction_no}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ubah waktu, nasabah, atau rincian mata uang transaksi ini (khusus Super Admin).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Waktu Transaksi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Waktu Transaksi
            </Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nomor transaksi langsung berubah menyesuaikan tanggal dan jam yang dipilih secara otomatis.
            </p>
          </div>

          {/* Nasabah */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Nasabah</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs text-primary font-medium p-0 hover:bg-transparent"
                onClick={() => setShowAddCustomer(true)}
              >
                <Plus className="h-3 w-3" />
                Tambah Nasabah Baru
              </Button>
            </div>

            {showAddCustomer ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <CustomerForm
                    onSuccess={(id) => {
                      onReloadCustomers();
                      setCustomerId(id);
                      setShowAddCustomer(false);
                    }}
                    onCancel={() => setShowAddCustomer(false)}
                    initialBranchId={transaction.branch_id || undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal h-10 text-sm"
                    >
                      {customerId === NO_CUSTOMER
                        ? "Walk-in (tanpa nasabah terdaftar)"
                        : selectedCust
                        ? `${selectedCust.customer_code} — ${selectedCust.full_name}`
                        : "Pilih nasabah"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Cari nasabah..." />
                      <CommandList>
                        <CommandEmpty>Nasabah tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="walk-in"
                            onSelect={() => setCustomerId(NO_CUSTOMER)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerId === NO_CUSTOMER ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Walk-in (tanpa nasabah terdaftar)
                          </CommandItem>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.customer_code} ${c.full_name}`}
                              onSelect={() => setCustomerId(c.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customerId === c.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {c.customer_code} — {c.full_name}
                                </span>
                                {c.is_blacklisted && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] h-3 px-1 w-fit mt-0.5"
                                  >
                                    DTTOT
                                  </Badge>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {blacklistBlock && (
                  <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-2.5 text-destructive text-xs flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Nasabah terdaftar DTTOT</span>. Transaksi diblokir demi kepatuhan APU-PPT.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rincian Mata Uang */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="text-sm font-semibold">
                  Rincian Mata Uang ({items.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Kelola mata uang yang ditransaksikan. Anda dapat menambah atau mengurangi valas.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Mata Uang
              </Button>
            </div>

            {/* Scrollable list of currency items */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {items.map((item, index) => {
                const subtotal = Number((item.rate * item.foreign_amount).toFixed(2));
                const selectedCurr = currencies.find((c) => c.id === item.currency_id);

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-card p-3 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                        Baris #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(index)}
                          title="Hapus baris ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Kolom Edit / Ubah Mata Uang */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Mata Uang *</Label>
                        <Select
                          value={item.currency_id}
                          onValueChange={(v) => handleCurrencyChange(index, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Pilih valas" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.code} - {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nominal Valas */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Nominal Valas ({selectedCurr?.code || "-"}) *
                        </Label>
                        <Input
                          type="text"
                          className="h-9 font-mono"
                          value={item.foreignInput}
                          onChange={(e) => handleForeignChange(index, e.target.value)}
                          onBlur={() => handleForeignBlur(index)}
                          placeholder="0"
                        />
                      </div>

                      {/* Kurs (IDR) */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Kurs (IDR) *</Label>
                        <Input
                          type="text"
                          className="h-9 font-mono"
                          value={item.rateInput}
                          onChange={(e) => handleRateChange(index, e.target.value)}
                          onBlur={() => handleRateBlur(index)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
                      <span className="text-muted-foreground">Subtotal IDR:</span>
                      <span className="font-mono font-bold">
                        {fmtIDR(isNaN(subtotal) ? 0 : subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total Box matching screenshot */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                TOTAL AKHIR TRANSAKSI (IDR)
              </div>
              <div className="text-2xl font-bold font-mono text-primary mt-0.5">
                {fmtIDR(totalAkhir)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {items.length} jenis mata uang
            </div>
          </div>

          {/* Metode Pembayaran & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan transaksi..."
                className="h-10 text-xs"
                maxLength={500}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || blacklistBlock}
            className={
              blacklistBlock
                ? "bg-destructive text-destructive-foreground cursor-not-allowed"
                : ""
            }
          >
            {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
