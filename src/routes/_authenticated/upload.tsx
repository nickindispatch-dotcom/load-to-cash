import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/upload")({
  component: () => <div className="space-y-2"><h1 className="text-2xl font-semibold">Upload & OCR</h1><p className="text-muted-foreground">Drop rate confirmations here — coming up next.</p></div>,
});
