import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useServerFn } from "@tanstack/react-start";
import { extractRateConfirmation } from "@/lib/ocr.functions";
import { fileToImageDataUrls } from "@/lib/pdf-to-images";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

type FileStatus = {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  message?: string;
  loadIds?: string[];
};

function UploadPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FileStatus[]>([]);
  const [running, setRunning] = useState(false);
  const extractFn = useServerFn(extractRateConfirmation);

  const onDrop = useCallback((accepted: File[]) => {
    setItems((prev) => [
      ...prev,
      ...accepted.map((f) => ({ id: crypto.randomUUID(), file: f, status: "pending" as const })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: true,
  });

  async function processItem(item: FileStatus) {
    setItems((p) => p.map((x) => x.id === item.id ? { ...x, status: "processing", message: "Reading file…" } : x));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const path = `${user.id}/${Date.now()}-${item.file.name}`;
      await supabase.storage.from("uploads").upload(path, item.file, { upsert: true });
      const { data: signed } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 365);

      setItems((p) => p.map((x) => x.id === item.id ? { ...x, message: "Extracting pages…" } : x));
      const images = await fileToImageDataUrls(item.file);

      const allLoadIds: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setItems((p) => p.map((x) => x.id === item.id ? { ...x, message: `OCR page ${i + 1}/${images.length}…` } : x));
        const result = await extractFn({
          data: {
            fileDataUrl: images[i],
            fileName: `${item.file.name} (page ${i + 1})`,
            mimeType: "image/png",
            sourceFileUrl: signed?.signedUrl,
          },
        });
        allLoadIds.push(...result.loadIds);
      }
      setItems((p) => p.map((x) => x.id === item.id ? { ...x, status: "done", message: `Extracted ${allLoadIds.length} load(s)`, loadIds: allLoadIds } : x));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setItems((p) => p.map((x) => x.id === item.id ? { ...x, status: "error", message: msg } : x));
      toast.error(`${item.file.name}: ${msg}`);
    }
  }

  async function runAll() {
    setRunning(true);
    const pending = items.filter((i) => i.status === "pending");
    const concurrency = 3;
    for (let i = 0; i < pending.length; i += concurrency) {
      await Promise.all(pending.slice(i, i + concurrency).map(processItem));
    }
    setRunning(false);
    toast.success("Processing complete");
  }

  const anyPending = items.some((i) => i.status === "pending");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload & OCR</h1>
        <p className="text-sm text-muted-foreground">Upload PDF or image rate confirmations. We&apos;ll extract carrier & load data automatically.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
          >
            <input {...getInputProps()} />
            <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground">PDF, PNG, JPG — multiple files supported</p>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-3 border rounded-md">
                <div className="shrink-0">
                  {it.status === "processing" && <Loader2 className="size-5 animate-spin text-primary" />}
                  {it.status === "done" && <CheckCircle2 className="size-5 text-green-600" />}
                  {it.status === "error" && <XCircle className="size-5 text-destructive" />}
                  {it.status === "pending" && <Upload className="size-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{it.file.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.message ?? "Ready"}</div>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setItems([])} disabled={running}>Clear</Button>
              <Button onClick={() => navigate({ to: "/loads" })} variant="outline">View loads</Button>
              <Button onClick={runAll} disabled={running || !anyPending}>
                {running ? <><Loader2 className="size-4 mr-2 animate-spin" /> Processing</> : "Process all"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
