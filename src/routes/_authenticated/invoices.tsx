import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate, fmtDateISO } from "@/lib/format";
import { toast } from "sonner";

const searchSchema = z.object({ create: z.string().optional() });

export const Route = createFileRoute("/_authenticated/invoices")({
  validateSearch: searchSchema,
  component: InvoicesPage,
});

type Invoice = { id: string; invoice_number: string; invoice_date: string; due_date: string; gross: number; fee_amount: number; due: number; status: string; carrier_id: string | null };
type Carrier = { id: string; name: string };

function InvoicesPage() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feePct, setFeePct] = useState(5);
  const [invoiceDate, setInvoiceDate] = useState(fmtDateISO(new Date()));
  const [dueDate, setDueDate] = useState(fmtDateISO(new Date(Date.now() + 30 * 86400000)));
  const [selectedLoads, setSelectedLoads] = useState<{ id: string; carrier_id: string | null; rate: number; load_number: string | null }[]>([]);

  async function refresh() {
    const [{ data: inv }, { data: c }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("carriers").select("id,name"),
    ]);
    setInvoices((inv ?? []) as Invoice[]);
    setCarriers((c ?? []) as Carrier[]);
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!create) return;
    const ids = create.split(",").filter(Boolean);
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from("loads").select("id,carrier_id,rate,load_number").in("id", ids);
      setSelectedLoads((data ?? []) as never);
      const { data: settings } = await supabase.from("settings").select("default_fee_pct").maybeSingle();
      if (settings) setFeePct(Number(settings.default_fee_pct ?? 5));
      setShowCreate(true);
    })();
  }, [create]);

  const gross = selectedLoads.reduce((a, l) => a + Number(l.rate || 0), 0);
  const fee = +(gross * feePct / 100).toFixed(2);
  const due = +(gross - fee).toFixed(2);
  const carrierId = selectedLoads[0]?.carrier_id ?? null;

  async function submit() {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: settings } = await supabase.from("settings").select("invoice_counter").maybeSingle();
      const nextNum = (settings?.invoice_counter ?? 1000) + 1;
      const invoice_number = String(nextNum);
      const { data: invRow, error } = await supabase.from("invoices").insert({
        user_id: user.id,
        carrier_id: carrierId,
        invoice_number,
        invoice_date: invoiceDate,
        due_date: dueDate,
        gross, fee_pct: feePct, fee_amount: fee, due,
        status: "unpaid",
      }).select("id").single();
      if (error) throw error;
      await supabase.from("settings").update({ invoice_counter: nextNum }).eq("user_id", user.id);
      await supabase.from("loads").update({ invoice_id: invRow.id }).in("id", selectedLoads.map((l) => l.id));
      toast.success(`Invoice #${invoice_number} created`);
      setShowCreate(false);
      navigate({ to: "/invoices/$id", params: { id: invRow.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  const carrierMap = new Map(carriers.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">All generated invoices.</p>
        </div>
        <Button asChild variant="outline"><Link to="/loads">Pick loads</Link></Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">New invoice — {carrierMap.get(carrierId ?? "") || "Carrier"} · {selectedLoads.length} load(s)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Invoice date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
              <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div><Label>Fee %</Label><Input type="number" step="0.1" value={feePct} onChange={(e) => setFeePct(Number(e.target.value))} /></div>
            </div>
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between"><span>Gross</span><span>{fmtMoney(gross)}</span></div>
              <div className="flex justify-between"><span>Fee ({feePct}%)</span><span>- {fmtMoney(fee)}</span></div>
              <div className="flex justify-between font-semibold"><span>Net Due</span><span>{fmtMoney(due)}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowCreate(false); navigate({ to: "/invoices" }); }}>Cancel</Button>
              <Button onClick={submit} disabled={creating || selectedLoads.length === 0}>{creating ? "Creating…" : "Create Invoice"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
              ) : invoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}>
                  <TableCell className="font-medium">#{inv.invoice_number}</TableCell>
                  <TableCell>{carrierMap.get(inv.carrier_id ?? "") || "—"}</TableCell>
                  <TableCell>{fmtDate(inv.invoice_date)}</TableCell>
                  <TableCell>{fmtDate(inv.due_date)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(inv.gross)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(inv.due)}</TableCell>
                  <TableCell className="capitalize">{inv.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
