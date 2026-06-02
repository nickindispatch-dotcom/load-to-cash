import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => <div className="space-y-2"><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-muted-foreground">Coming up next — stats and recent invoices.</p></div>,
});
