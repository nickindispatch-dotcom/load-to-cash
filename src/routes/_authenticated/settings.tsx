import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      setS(data ?? {});
    })();
  }, []);

  function set<K extends string>(k: K, v: any) { setS((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...s, user_id: user.id };
    const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  }

  if (!s) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your company info and defaults shown on invoices.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Company name</Label><Input value={s.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} /></div>
            <div><Label>Your name</Label><Input value={s.sender_name ?? ""} onChange={(e) => set("sender_name", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={s.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={s.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
            <div><Label>Default fee %</Label><Input type="number" step="0.1" value={s.default_fee_pct ?? 5} onChange={(e) => set("default_fee_pct", Number(e.target.value))} /></div>
            <div><Label>Next invoice number</Label><Input type="number" value={s.invoice_counter ?? 1000} onChange={(e) => set("invoice_counter", Number(e.target.value))} /></div>
          </div>
          <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Zelle</Label><Input value={s.zelle ?? ""} onChange={(e) => set("zelle", e.target.value)} /></div>
            <div><Label>CashApp</Label><Input value={s.cashapp ?? ""} onChange={(e) => set("cashapp", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Bank transfer details</Label><Textarea rows={3} value={s.bank_transfer ?? ""} onChange={(e) => set("bank_transfer", e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
