import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/templates")({
  component: TemplatesPage,
});

type Tpl = { id: string; name: string; is_default: boolean; user_id: string | null };

function TemplatesPage() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("invoice_templates").select("id,name,is_default,user_id").order("name");
      setTpls((data ?? []) as Tpl[]);
    })();
  }, []);
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">Built-in invoice templates. Custom templates coming soon.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {tpls.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.user_id ? "Custom" : "Built-in"}</div>
              </div>
              {t.is_default && <Badge>Default</Badge>}
            </CardContent>
          </Card>
        ))}
        {tpls.length === 0 && <p className="text-sm text-muted-foreground">No templates.</p>}
      </div>
    </div>
  );
}
