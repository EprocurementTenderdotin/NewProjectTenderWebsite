import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DocumentPreviewProps = {
  url: string;
  name: string;
  mime: string | null;
  onDownload?: () => void;
};

function isPdf(mime: string | null | undefined, name: string) {
  return (mime || "").toLowerCase() === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

export function DocumentPreview({ url, name, mime, onDownload }: DocumentPreviewProps) {
  if ((mime || "").startsWith("image/")) {
    return <img src={url} alt={name} className="h-full w-full object-contain" />;
  }

  if (isPdf(mime, name)) {
    return <PdfCanvasPreview url={url} name={name} onDownload={onDownload} />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Preview is not available for this file type.</p>
      {onDownload && (
        <Button type="button" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download file
        </Button>
      )}
    </div>
  );
}

function PdfCanvasPreview({ url, name, onDownload }: { url: string; name: string; onDownload?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: any = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setPageNumber(1);
      setPageCount(0);

      try {
        const [pdfjs, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const buffer = await fetch(url).then((response) => {
          if (!response.ok) throw new Error(`Preview failed (${response.status})`);
          return response.arrayBuffer();
        });
        loadedDoc = await pdfjs.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        setPdfDoc(loadedDoc);
        setPageCount(loadedDoc.numPages);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not render PDF preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      loadedDoc?.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const containerWidth = Math.max(canvas.parentElement?.clientWidth ?? 900, 320);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.max(0.8, (containerWidth - 32) / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare preview canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not render this page");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="flex h-full w-full flex-col bg-muted">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="min-w-0 text-xs font-medium text-muted-foreground">
          {pageCount > 0 ? `Page ${pageNumber} of ${pageCount}` : name}
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!pageCount || pageNumber >= pageCount} onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onDownload && (
            <Button type="button" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="relative flex-1 overflow-auto p-3">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {error ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center text-sm">
            <p className="font-medium text-destructive">{error}</p>
            {onDownload && <Button type="button" onClick={onDownload}>Download file</Button>}
          </div>
        ) : (
          <canvas ref={canvasRef} aria-label={name} className="mx-auto block max-w-full rounded bg-white shadow-sm" />
        )}
      </div>
    </div>
  );
}