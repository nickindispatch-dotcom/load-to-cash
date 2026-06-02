import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, fmtDate } from "@/lib/format";
import { buildInvoicePdf, buildInvoiceXlsx } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { Download, FileSpreadsheet, ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [carrier, setCarrier] = useState<any>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  async function refresh() {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
    if (!inv) return;
    setInvoice(inv);
    const [{ data: c }, { data: l }, { data: s }] = await Promise.all([
      inv.carrier_id ? supabase.from("carriers").select("*").eq("id", inv.carrier_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("loads").select("*").eq("invoice_id", id),
      supabase.from("settings").select("*").maybeSingle(),
    ]);
    setCarrier(c);
    setLoads(l ?? []);
    setSettings(s);
  }
  useEffect(() => { refresh(); }, [id]);

  async function downloadPdf() {
    if (!invoice) return;
    const doc = buildInvoicePdf(invoice, settings ?? {}, carrier ?? {}, loads);
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  }
  async function downloadXlsx() {
    if (!invoice) return;
    const buf = await buildInvoiceXlsx(invoice, settings ?? {}, carrier ?? {}, loads);
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `invoice-${invoice.invoice_number}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }
  async function setStatus(status: string) {
    await supabase.from("invoices").update({ status }).eq("id", id);
    toast.success("Status updated");
    refresh();
  }
  async function remove() {
    if (!confirm("Delete invoice? Loads will be released back to unbilled.")) return;
    await supabase.from("loads").update({ invoice_id: null }).eq("invoice_id", id);
    await supabase.from("invoices").delete().eq("id", id);
    toast.success("Deleted");
    window.history.back();
  }

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  useEffect(() => {
    if (!invoice) return;
    let url: string | null = null;
    try {
      const doc = buildInvoicePdf(invoice, settings ?? {}, carrier ?? {}, loads);
      const blob = doc.output("blob");
      url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfError(null);
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "Failed to generate preview");
      setPdfUrl(null);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [invoice, settings, carrier, loads]);

  if (!invoice) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/invoices"><ArrowLeft className="size-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoice #{invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">{carrier?.name ?? "—"} · {fmtDate(invoice.invoice_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={invoice.status} onValueChange={setStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadXlsx}><FileSpreadsheet className="size-4 mr-2" />XLSX</Button>
          <Button onClick={downloadPdf}><Download className="size-4 mr-2" />PDF</Button>
          <Button variant="ghost" size="icon" onClick={remove}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Load #</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.load_number || "—"}</TableCell>
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

      <Card>
        <CardContent className="p-6">
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>Gross</span><span>{fmtMoney(invoice.gross)}</span></div>
            <div className="flex justify-between"><span>Fee ({invoice.fee_pct}%)</span><span>- {fmtMoney(invoice.fee_amount)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Net Due</span><span>{fmtMoney(invoice.due)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-2 border-b text-sm font-medium text-muted-foreground">PDF Preview</div>
          {pdfUrl ? (
            <iframe
              title="Invoice PDF preview"
              src={pdfUrl}
              className="w-full h-[900px] bg-white rounded-b-lg"
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {pdfError ? `Preview error: ${pdfError}` : "Generating preview…"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
