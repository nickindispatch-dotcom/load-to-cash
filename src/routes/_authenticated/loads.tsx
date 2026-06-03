import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate, fmtDateISO } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/loads")({
  component: LoadsPage,
});

type Load = {
  id: string;
  carrier_id: string | null;
  invoice_id: string | null;
  load_number: string | null;
  broker: string | null;
  pickup_date: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  rate: number;
  mc_number: string | null;
  phone_number: string | null;
  my_charge_pct: number | null;
  my_charge_amount: number | null;
};
type Carrier = { id: string; name: string };

const emptyManual = {
  carrier_id: "",
  new_carrier_name: "",
  load_number: "",
  broker: "",
  pickup_date: fmtDateISO(new Date()),
  pickup_city: "",
  pickup_state: "",
  delivery_city: "",
  delivery_state: "",
  rate: "",
  mc_number: "",
  phone_number: "",
  my_charge_pct: "",
};

function LoadsPage() {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyManual);

  async function refresh() {
    setLoading(true);
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from("loads").select("*").is("invoice_id", null).order("created_at", { ascending: false }),
      supabase.from("carriers").select("id,name"),
    ]);
    setLoads((l ?? []) as Load[]);
    setCarriers((c ?? []) as Carrier[]);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const carrierMap = useMemo(() => new Map(carriers.map((c) => [c.id, c.name])), [carriers]);
  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return loads.filter((l) =>
      !f ||
      l.load_number?.toLowerCase().includes(f) ||
      l.broker?.toLowerCase().includes(f) ||
      carrierMap.get(l.carrier_id ?? "")?.toLowerCase().includes(f)
    );
  }, [loads, filter, carrierMap]);

  const selectedLoads = filtered.filter((l) => selected.has(l.id));
  const selectedCarriers = new Set(selectedLoads.map((l) => l.carrier_id));
  const canInvoice = selectedLoads.length > 0 && selectedCarriers.size === 1;
  const total = selectedLoads.reduce((a, l) => a + Number(l.rate || 0), 0);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => s.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)));
  }

  async function createInvoice() {
    if (!canInvoice) return;
    navigate({ to: "/invoices", search: { create: selectedLoads.map((l) => l.id).join(",") } as never });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} load(s)?`)) return;
    const { error } = await supabase.from("loads").delete().in("id", [...selected]);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setSelected(new Set());
    refresh();
  }

  // Calculate my charge amount when percentage changes
  const myChargeAmount = form.rate && form.my_charge_pct 
    ? ((Number(form.rate) * Number(form.my_charge_pct)) / 100).toFixed(2)
    : "0.00";

  async function saveManual() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (!form.rate) throw new Error("Load price is required");
      let carrier_id = form.carrier_id;
      if (!carrier_id) {
        const name = form.new_carrier_name.trim();
        if (!name) throw new Error("Pick a carrier or enter a new carrier name");
        const { data: cRow, error: cErr } = await supabase.from("carriers")
          .insert({ user_id: user.id, name }).select("id").maybeSingle();
        if (cErr) throw cErr;
        if (!cRow) throw new Error("Failed to create carrier");
        carrier_id = cRow.id;
      }
      const { error } = await supabase.from("loads").insert({
        user_id: user.id,
        carrier_id,
        load_number: form.load_number || null,
        broker: form.broker || null,
        pickup_date: form.pickup_date || null,
        pickup_city: form.pickup_city || null,
        pickup_state: form.pickup_state || null,
        delivery_city: form.delivery_city || null,
        delivery_state: form.delivery_state || null,
        rate: Number(form.rate),
        mc_number: form.mc_number || null,
        phone_number: form.phone_number || null,
        my_charge_pct: form.my_charge_pct ? Number(form.my_charge_pct) : 0,
        my_charge_amount: Number(myChargeAmount),
      });
      if (error) throw error;
      toast.success("Load added");
      setShowAdd(false);
      setForm(emptyManual);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loads</h1>
          <p className="text-sm text-muted-foreground">Unbilled loads available for invoicing.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="size-4 mr-2" />Add manually</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add load manually</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {/* Carrier Section */}
                <div className="col-span-2">
                  <Label className="font-semibold text-sm">Carrier Information</Label>
                </div>
                <div className="col-span-2">
                  <Label>Carrier</Label>
                  <Select value={form.carrier_id || "__new"} onValueChange={(v) => setForm({ ...form, carrier_id: v === "__new" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new">+ New carrier</SelectItem>
                      {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!form.carrier_id && (
                  <div className="col-span-2">
                    <Label>New carrier name</Label>
                    <Input value={form.new_carrier_name} onChange={(e) => setForm({ ...form, new_carrier_name: e.target.value })} placeholder="e.g., ABC Transport LLC" />
                  </div>
                )}
                <div>
                  <Label>MC Number</Label>
                  <Input value={form.mc_number} onChange={(e) => setForm({ ...form, mc_number: e.target.value })} placeholder="e.g., 123456" />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="e.g., (555) 123-4567" />
                </div>

                {/* Load Details Section */}
                <div className="col-span-2 border-t pt-4">
                  <Label className="font-semibold text-sm">Load Details</Label>
                </div>
                <div>
                  <Label>Load #</Label>
                  <Input value={form.load_number} onChange={(e) => setForm({ ...form, load_number: e.target.value })} placeholder="e.g., 9387704" />
                </div>
                <div>
                  <Label>Broker</Label>
                  <Input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g., Broker Name" />
                </div>
                <div>
                  <Label>Pickup Date</Label>
                  <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
                </div>
                <div>
                  <Label>Load Price/Amount ($)</Label>
                  <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Pickup City</Label>
                  <Input value={form.pickup_city} onChange={(e) => setForm({ ...form, pickup_city: e.target.value })} placeholder="e.g., Memphis" />
                </div>
                <div>
                  <Label>Pickup State</Label>
                  <Input value={form.pickup_state} onChange={(e) => setForm({ ...form, pickup_state: e.target.value })} placeholder="e.g., TN" />
                </div>
                <div>
                  <Label>Delivery City</Label>
                  <Input value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} placeholder="e.g., Atlanta" />
                </div>
                <div>
                  <Label>Delivery State</Label>
                  <Input value={form.delivery_state} onChange={(e) => setForm({ ...form, delivery_state: e.target.value })} placeholder="e.g., GA" />
                </div>

                {/* My Charge Section */}
                <div className="col-span-2 border-t pt-4">
                  <Label className="font-semibold text-sm">My Charge</Label>
                </div>
                <div>
                  <Label>My Charge Percentage (%)</Label>
                  <Input type="number" step="0.01" value={form.my_charge_pct} onChange={(e) => setForm({ ...form, my_charge_pct: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>My Charge Amount ($)</Label>
                  <Input type="text" value={myChargeAmount} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated: ({form.rate} × {form.my_charge_pct}%) / 100</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={saveManual} disabled={saving}>{saving ? "Saving…" : "Save load"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={deleteSelected} disabled={selected.size === 0}><Trash2 className="size-4 mr-2" />Delete</Button>
          <Button onClick={createInvoice} disabled={!canInvoice}>
            Create Invoice {selectedLoads.length > 0 && `(${selectedLoads.length} · ${fmtMoney(total)})`}
          </Button>
        </div>
      </div>
      <Input placeholder="Filter by load #, broker, carrier…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      {!canInvoice && selected.size > 0 && (
        <p className="text-xs text-amber-600">Select loads from a single carrier to create an invoice.</p>
      )}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Load #</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">My Charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No unbilled loads. Upload rate confirmations or add a load manually.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id} data-state={selected.has(l.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} /></TableCell>
                  <TableCell className="font-medium">{l.load_number || "—"}</TableCell>
                  <TableCell>{carrierMap.get(l.carrier_id ?? "") || "—"}</TableCell>
                  <TableCell>{l.broker || "—"}</TableCell>
                  <TableCell>{fmtDate(l.pickup_date)}</TableCell>
                  <TableCell>{[l.pickup_city, l.pickup_state].filter(Boolean).join(", ")}</TableCell>
                  <TableCell>{[l.delivery_city, l.delivery_state].filter(Boolean).join(", ")}</TableCell>
                  <TableCell className="text-right">{fmtMoney(l.rate)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(l.my_charge_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
