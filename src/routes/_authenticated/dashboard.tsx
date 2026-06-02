import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Package, DollarSign, Percent, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Stats = { loads: number; gross: number; fees: number; invoices: number };
type RecentInvoice = { id: string; invoice_number: string; invoice_date: string; due: number; status: string };

function Dashboard() {
  const [stats, setStats] = useState<Stats>({ loads: 0, gross: 0, fees: 0, invoices: 0 });
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: loadsCount }, { data: loadRows }, { count: invCount }, { data: invRows }, { data: recentRows }] = await Promise.all([
        supabase.from("loads").select("*", { count: "exact", head: true }),
        supabase.from("loads").select("rate"),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("gross,fee_amount"),
        supabase.from("invoices").select("id,invoice_number,invoice_date,due,status").order("created_at", { ascending: false }).limit(5),
      ]);
      const gross = (invRows ?? []).reduce((a, r) => a + Number(r.gross || 0), 0) || (loadRows ?? []).reduce((a, r) => a + Number(r.rate || 0), 0);
      const fees = (invRows ?? []).reduce((a, r) => a + Number(r.fee_amount || 0), 0);
      setStats({ loads: loadsCount ?? 0, gross, fees, invoices: invCount ?? 0 });
      setRecent((recentRows ?? []) as RecentInvoice[]);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Total Loads", value: stats.loads, icon: Package },
    { label: "Gross Revenue", value: fmtMoney(stats.gross), icon: DollarSign },
    { label: "Dispatch Fees", value: fmtMoney(stats.fees), icon: Percent },
    { label: "Invoices", value: stats.invoices, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your dispatch business.</p>
        </div>
        <Button asChild><Link to="/upload">New Upload</Link></Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{loading ? "—" : c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet. Upload a rate confirmation to get started.</p>
          ) : (
            <div className="divide-y">
              {recent.map((r) => (
                <Link key={r.id} to="/invoices/$id" params={{ id: r.id }} className="flex items-center justify-between py-3 hover:bg-accent/50 px-2 -mx-2 rounded">
                  <div>
                    <div className="font-medium">#{r.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(r.invoice_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{fmtMoney(r.due)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{r.status}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
