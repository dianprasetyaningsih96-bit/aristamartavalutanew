import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { up } from "@/lib/text-case";
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
import { Check, ChevronsUpDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CustomerOpt {
  id: string;
  customer_code: string;
  full_name: string;
  risk_rating: string;
  kyc_status: string;
  is_blacklisted: boolean;
  blacklist_reason?: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
  customers: CustomerOpt[];
  currencies: { id: string; code: string; name: string }[];
  rates: any[];
  onReloadCustomers: () => void;
  onSaved: () => void;
}

const NO_CUSTOMER = "__walkin__";

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  customers,
  onSaved,
}: EditTransactionDialogProps) {
  const [customerId, setCustomerId] = useState<string>(NO_CUSTOMER);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setCustomerId(transaction.customer_id || NO_CUSTOMER);
      setPaymentMethod(transaction.payment_method || "cash");
      setNotes(transaction.notes || "");
    }
  }, [transaction]);

  async function handleSave() {
    if (!transaction) return;
    setSaving(true);

    const { error } = await supabase
      .from("transactions")
      .update({
        customer_id: customerId === NO_CUSTOMER ? null : customerId,
        payment_method: paymentMethod as any,
        notes: up(notes) || null,
      })
      .eq("id", transaction.id);

    setSaving(false);

    if (error) {
      toast.error("Gagal memperbarui transaksi", { description: error.message });
      return;
    }

    toast.success("Transaksi berhasil diperbarui");
    onSaved();
    onOpenChange(false);
  }

  if (!transaction) return null;

  const selectedCust = customers.find((c) => c.id === customerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" /> Edit Transaksi
          </DialogTitle>
          <DialogDescription>
            Ubah data transaksi {transaction.transaction_no} (khusus Super Admin).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info transaksi tidak bisa diubah langsung demi audit kas */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">No. Transaksi:</span>
              <span className="font-mono font-semibold">{transaction.transaction_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe:</span>
              <span className="font-semibold uppercase">{transaction.transaction_type === "buy" ? "Beli Valas" : "Jual Valas"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total IDR:</span>
              <span className="font-mono font-bold">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(transaction.idr_amount || 0)}
              </span>
            </div>
          </div>

          {/* Nasabah */}
          <div className="space-y-2">
            <Label>Nasabah</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
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
                          <span>
                            {c.customer_code} — {c.full_name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan transaksi..."
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
