// Client-only: render PDF pages to PNG data URLs using pdfjs-dist
export async function fileToImageDataUrls(file: File): Promise<string[]> {
  if (file.type.startsWith("image/")) {
    return [await fileToDataUrl(file)];
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)).default as string;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const ab = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: ab }).promise;
    const out: string[] = [];
    const max = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      out.push(canvas.toDataURL("image/png"));
    }
    return out;
  }
  throw new Error(`Unsupported file type: ${file.type || file.name}`);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
