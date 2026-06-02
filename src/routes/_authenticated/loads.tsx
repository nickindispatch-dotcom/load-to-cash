import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
};
type Carrier = { id: string; name: string };

function LoadsPage() {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loads</h1>
          <p className="text-sm text-muted-foreground">Unbilled loads available for invoicing.</p>
        </div>
        <div className="flex gap-2">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No unbilled loads. Upload rate confirmations to get started.</TableCell></TableRow>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
