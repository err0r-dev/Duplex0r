import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertOctagon, ArrowUpDown, Download, Loader2, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { SplashScreen } from "./components/SplashScreen";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Progress } from "./components/ui/progress";
import { Separator } from "./components/ui/separator";
import { FileDropZone } from "./components/FileDropZone";
import { ThemeToggle } from "./components/theme-toggle";

type Order = "first_second" | "second_first";

type ProcessingLog = {
  id: number;
  created_at: string;
  first_pdf_name: string;
  second_pdf_name: string;
  swapped_order: boolean;
  output_filename: string;
  status: string;
  error_message: string | null;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
};

function App() {
  const [firstFile, setFirstFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [reverseFirstPdf, setReverseFirstPdf] = useState(false);
  const [reverseSecondPdf, setReverseSecondPdf] = useState(false);
  const [order, setOrder] = useState<Order>("first_second");
  const [defaultOrder, setDefaultOrder] = useState<Order>("first_second");
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [outputFilename, setOutputFilename] = useState("");
  const [showClearLogsDialog, setShowClearLogsDialog] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    return localStorage.getItem("duplex0r_splash_seen") !== "true";
  });

  const canProcess = useMemo(
    () => Boolean(firstFile && secondFile && !isProcessing),
    [firstFile, secondFile, isProcessing],
  );

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/logs/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs (${response.status})`);
      }
      const payload = (await response.json()) as ProcessingLog[];
      setLogs(payload);
    } catch (fetchError) {
      console.error(fetchError);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/logs/`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to clear logs (${response.status})`);
      }
      const result = (await response.json()) as { message: string; count: number };
      setSuccessMessage(result.message);
      setShowClearLogsDialog(false);
      void refreshLogs();
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to clear logs.");
    } finally {
      setIsClearingLogs(false);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch settings (${response.status})`);
      }
      const payload = (await response.json()) as { default_order: Order };
      setDefaultOrder(payload.default_order);
      setOrder(payload.default_order);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to load settings from the server. Using defaults.");
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void refreshLogs();
  }, [loadSettings, refreshLogs]);

  const handleSwapFiles = () => {
    if (!firstFile && !secondFile) return;
    setError(null);
    setSuccessMessage(null);
    const currentFirst = firstFile;
    const currentSecond = secondFile;
    const currentReverseFirst = reverseFirstPdf;
    const currentReverseSecond = reverseSecondPdf;
    setFirstFile(currentSecond);
    setSecondFile(currentFirst);
    setReverseFirstPdf(currentReverseSecond);
    setReverseSecondPdf(currentReverseFirst);
    setOrder((prev) => (prev === "first_second" ? "second_first" : "first_second"));
  };

  const handleProcess = () => {
    setError(null);
    setSuccessMessage(null);

    if (!firstFile || !secondFile) {
      setError("Select two PDF files before processing.");
      return;
    }

    // Generate suggested filename
    const firstName = firstFile.name.replace(/\.pdf$/i, "");
    const secondName = secondFile.name.replace(/\.pdf$/i, "");
    const suggestedFilename = `${firstName}_${secondName}_interleaved.pdf`;

    setOutputFilename(suggestedFilename);
    setShowFilenameDialog(true);
  };

  const handleConfirmProcess = async () => {
    if (!firstFile || !secondFile) {
      return;
    }

    // Validate filename
    let finalFilename = outputFilename.trim();
    if (!finalFilename) {
      setError("Please enter a filename.");
      return;
    }

    // Ensure .pdf extension
    if (!finalFilename.toLowerCase().endsWith(".pdf")) {
      finalFilename += ".pdf";
    }

    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append("first_pdf", firstFile);
      formData.append("second_pdf", secondFile);
      formData.append("order", order);
      formData.append("reverse_first", String(reverseFirstPdf));
      formData.append("reverse_second", String(reverseSecondPdf));

      const response = await fetch(`${API_BASE_URL}/process/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Processing failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = finalFilename;
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Processing complete. Downloaded ${finalFilename}.`);
      setShowFilenameDialog(false);
      void refreshLogs();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unexpected error during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFirstFile(null);
    setSecondFile(null);
    setReverseFirstPdf(false);
    setReverseSecondPdf(false);
    setOrder(defaultOrder);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveDefaultOrder = async () => {
    setIsSavingSettings(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_order: order }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Unable to save default order.");
      }
      setDefaultOrder(order);
      setSuccessMessage("Default order saved.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to save default order.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const orderLabel = order === "first_second" ? "First PDF first" : "Second PDF first";

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
    localStorage.setItem("duplex0r_splash_seen", "true");
  }, []);

  const handleShowSplash = useCallback(() => {
    setShowSplash(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}

      <header className="border-b bg-card/50">
        <div className="container flex items-center justify-between gap-2 py-6">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight header-title-clickable"
              onClick={handleShowSplash}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleShowSplash();
                }
              }}
            >
              Duplex0r PDF Interleaver
            </h1>
            <p className="text-muted-foreground">
              Upload two PDFs, choose the order, and generate an interleaved result instantly.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container space-y-6 py-10">
        {error && (
          <Alert variant="destructive">
            <div className="flex items-start gap-2">
              <AlertOctagon className="mt-0.5 h-4 w-4" />
              <div>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select the two PDF documents to interleave.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <FileDropZone
                id="first-pdf"
                label="First PDF"
                selectedFile={firstFile}
                onFileSelect={setFirstFile}
                formatBytes={formatBytes}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reverse-first"
                  checked={reverseFirstPdf}
                  onCheckedChange={(checked) => setReverseFirstPdf(checked === true)}
                />
                <Label
                  htmlFor="reverse-first"
                  className="text-sm font-normal cursor-pointer"
                >
                  Reverse page order (for duplex scanning)
                </Label>
              </div>
            </div>
            <div className="space-y-3">
              <FileDropZone
                id="second-pdf"
                label="Second PDF"
                selectedFile={secondFile}
                onFileSelect={setSecondFile}
                formatBytes={formatBytes}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reverse-second"
                  checked={reverseSecondPdf}
                  onCheckedChange={(checked) => setReverseSecondPdf(checked === true)}
                />
                <Label
                  htmlFor="reverse-second"
                  className="text-sm font-normal cursor-pointer"
                >
                  Reverse page order (for duplex scanning)
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Order:</span>
              <div className="flex rounded-md border">
                <Button
                  variant={order === "first_second" ? "default" : "ghost"}
                  className="rounded-none rounded-l-md"
                  onClick={() => setOrder("first_second")}
                >
                  First → Second
                </Button>
                <Separator orientation="vertical" />
                <Button
                  variant={order === "second_first" ? "default" : "ghost"}
                  className="rounded-none rounded-r-md"
                  onClick={() => setOrder("second_first")}
                >
                  Second → First
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSwapFiles}
                disabled={!firstFile && !secondFile}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Swap uploads
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                type="button"
                onClick={handleProcess}
                disabled={!canProcess}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Process
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Save your preferred default order for future sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Current selection</p>
              <p className="text-sm text-muted-foreground">{orderLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Default order:{" "}
                <span className="font-medium">
                  {defaultOrder === "first_second" ? "First PDF first" : "Second PDF first"}
                </span>
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDefaultOrder}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Save as default order
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              A log of the most recent processing operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loadingLogs ? "Refreshing logs…" : `Showing ${logs.length} entr${logs.length === 1 ? "y" : "ies"}.`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearLogsDialog(true)}
                  disabled={loadingLogs || logs.length === 0}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Clear All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refreshLogs()}
                  disabled={loadingLogs}
                >
                  {loadingLogs ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Timestamp</th>
                    <th className="p-3 text-left font-medium">First PDF</th>
                    <th className="p-3 text-left font-medium">Second PDF</th>
                    <th className="p-3 text-left font-medium">Order</th>
                    <th className="p-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                        No logs yet. Process your first set of PDFs above.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="truncate p-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="truncate p-3">{log.first_pdf_name}</td>
                      <td className="truncate p-3">{log.second_pdf_name}</td>
                      <td className="p-3">
                        {log.swapped_order ? "Second → First" : "First → Second"}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            log.status === "completed"
                              ? "font-medium text-emerald-600"
                              : log.status === "pending"
                                ? "text-muted-foreground"
                                : "font-medium text-destructive"
                          }
                        >
                          {log.status}
                        </span>
                        {log.error_message && (
                          <p className="text-xs text-destructive">{log.error_message}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card/50 py-4 text-center">
        <a
          href="https://err0r.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          © 2025 err0r.dev
        </a>
      </footer>

      <Dialog open={showFilenameDialog} onOpenChange={setShowFilenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name Your Output File</DialogTitle>
            <DialogDescription>
              Enter a filename for the interleaved PDF. The .pdf extension will be added automatically if not included.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="interleaved.pdf"
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    void handleConfirmProcess();
                  }
                }}
              />
            </div>
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                </div>
                <Progress className="h-2" />
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilenameDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmProcess()}
              disabled={isProcessing || !outputFilename.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Confirm & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearLogsDialog} onOpenChange={setShowClearLogsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Logs?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {logs.length} processing log{logs.length === 1 ? "" : "s"}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearLogsDialog(false)}
              disabled={isClearingLogs}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleClearLogs()}
              disabled={isClearingLogs}
            >
              {isClearingLogs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Logs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
