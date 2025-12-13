import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { SplashScreen } from "./components/SplashScreen";
import { Button } from "./components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
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

// Step progress indicator component
function StepProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const stepLabels = ["Upload first PDF", "Upload second PDF", "Merge files"];
  return (
    <nav aria-label="Guide progress" className="step-progress">
      <div
        className={`step-dot ${currentStep >= 1 ? (currentStep > 1 ? "completed" : "active") : ""}`}
        aria-current={currentStep === 1 ? "step" : undefined}
        aria-label={`Step 1: ${stepLabels[0]}${currentStep > 1 ? " (completed)" : currentStep === 1 ? " (current)" : ""}`}
      >
        {currentStep > 1 ? <Check className="h-4 w-4" aria-hidden="true" /> : "1"}
      </div>
      <div className={`step-line ${currentStep > 1 ? "completed" : ""}`} aria-hidden="true" />
      <div
        className={`step-dot ${currentStep >= 2 ? (currentStep > 2 ? "completed" : "active") : ""}`}
        aria-current={currentStep === 2 ? "step" : undefined}
        aria-label={`Step 2: ${stepLabels[1]}${currentStep > 2 ? " (completed)" : currentStep === 2 ? " (current)" : ""}`}
      >
        {currentStep > 2 ? <Check className="h-4 w-4" aria-hidden="true" /> : "2"}
      </div>
      <div className={`step-line ${currentStep > 2 ? "completed" : ""}`} aria-hidden="true" />
      <div
        className={`step-dot ${currentStep === 3 ? "active" : ""}`}
        aria-current={currentStep === 3 ? "step" : undefined}
        aria-label={`Step 3: ${stepLabels[2]}${currentStep === 3 ? " (current)" : ""}`}
      >
        3
      </div>
    </nav>
  );
}

// Guided mode illustrations
function OddPagesIllustration() {
  return (
    <div className="guide-illustration">
      <div className="mini-pdf-stack" style={{ left: "50%", transform: "translateX(-50%)" }}>
        <div className="mini-pdf-page odd highlighted">
          <span className="page-number">1</span>
        </div>
        <div className="mini-pdf-page even" style={{ marginLeft: "8px" }}>
          <span className="page-number">2</span>
        </div>
        <div className="mini-pdf-page odd highlighted" style={{ marginLeft: "16px" }}>
          <span className="page-number">3</span>
        </div>
        <div className="mini-pdf-page even" style={{ marginLeft: "24px" }}>
          <span className="page-number">4</span>
        </div>
        <div className="mini-pdf-page odd highlighted" style={{ marginLeft: "32px" }}>
          <span className="page-number">5</span>
        </div>
      </div>
    </div>
  );
}

function EvenPagesIllustration() {
  return (
    <div className="guide-illustration">
      <div className="mini-pdf-stack" style={{ left: "50%", transform: "translateX(-50%)" }}>
        <div className="mini-pdf-page odd">
          <span className="page-number">1</span>
        </div>
        <div className="mini-pdf-page even highlighted" style={{ marginLeft: "8px" }}>
          <span className="page-number">2</span>
        </div>
        <div className="mini-pdf-page odd" style={{ marginLeft: "16px" }}>
          <span className="page-number">3</span>
        </div>
        <div className="mini-pdf-page even highlighted" style={{ marginLeft: "24px" }}>
          <span className="page-number">4</span>
        </div>
        <div className="mini-pdf-page odd" style={{ marginLeft: "32px" }}>
          <span className="page-number">5</span>
        </div>
      </div>
    </div>
  );
}

function MergeIllustration() {
  return (
    <div className="guide-illustration">
      <div className="mini-pdf-stack" style={{ left: "20px", top: "10px" }}>
        <div className="mini-pdf-page odd">
          <span className="page-number">1</span>
        </div>
        <div className="mini-pdf-page odd" style={{ marginLeft: "6px" }}>
          <span className="page-number">3</span>
        </div>
      </div>
      <ArrowRight className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
      <div className="mini-pdf-stack" style={{ right: "20px", top: "10px" }}>
        <div className="mini-pdf-page even">
          <span className="page-number">2</span>
        </div>
        <div className="mini-pdf-page even" style={{ marginLeft: "6px" }}>
          <span className="page-number">4</span>
        </div>
      </div>
    </div>
  );
}

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
  const [showSplash, setShowSplash] = useState(true);

  // Guided mode state
  const [guidedMode, setGuidedMode] = useState(() => {
    return localStorage.getItem("duplex0r_guided_mode") === "true";
  });
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
    setCurrentStep(1);
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

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleShowSplash = useCallback(() => {
    setShowSplash(true);
  }, []);

  const handleToggleGuidedMode = useCallback(() => {
    setGuidedMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("duplex0r_guided_mode", String(newValue));
      return newValue;
    });
    setCurrentStep(1);
  }, []);

  // Guided mode navigation
  const handleNextStep = () => {
    if (currentStep === 1 && firstFile) {
      setCurrentStep(2);
    } else if (currentStep === 2 && secondFile) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between gap-4 py-4">
          <h1
            className="text-2xl header-title-gradient"
            onClick={handleShowSplash}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleShowSplash();
              }
            }}
          >
            Duplex0r
          </h1>

          <div className="flex items-center gap-2">
            {/* Settings Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings & History</SheetTitle>
                  <SheetDescription>
                    Manage your preferences and view processing history.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Preferences Section */}
                  <div>
                    <h3 className="font-semibold mb-3">Default Order</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Current: {order === "first_second" ? "First PDF first" : "Second PDF first"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Saved default: {defaultOrder === "first_second" ? "First PDF first" : "Second PDF first"}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveDefaultOrder}
                      disabled={isSavingSettings || order === defaultOrder}
                    >
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save current as default"
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Recent Activity Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Recent Activity</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowClearLogsDialog(true)}
                          disabled={loadingLogs || logs.length === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshLogs()}
                          disabled={loadingLogs}
                        >
                          <RefreshCcw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No processing history yet.
                      </p>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="logs-table">
                          <thead>
                            <tr>
                              <th>Files</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => (
                              <tr key={log.id}>
                                <td>
                                  <div className="text-xs truncate max-w-[150px]">
                                    {log.first_pdf_name}
                                  </div>
                                  <div className="text-xs truncate max-w-[150px] text-muted-foreground">
                                    + {log.second_pdf_name}
                                  </div>
                                </td>
                                <td>
                                  <span className={
                                    log.status === "completed"
                                      ? "status-completed"
                                      : log.status === "error"
                                        ? "status-error"
                                        : ""
                                  }>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1 py-8">
        {/* Error/Success Messages */}
        <div role="status" aria-live="polite" aria-atomic="true">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <div className="flex items-start gap-2">
                <AlertOctagon className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <div>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-6">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        {guidedMode ? (
          /* ===== GUIDED MODE ===== */
          <div className="animate-fade-in">
            <div className="mb-6">
              <StepProgress currentStep={currentStep} />
            </div>

            <div className="guided-card animate-slide-up">
              {currentStep === 1 && (
                <>
                  <h2 className="guided-step-title">Upload Your First PDF</h2>
                  <p className="guided-step-description">
                    This should contain your <strong>odd pages</strong> (1, 3, 5, 7...)
                  </p>
                  <OddPagesIllustration />
                  <FileDropZone
                    id="first-pdf"
                    label="First PDF (Odd Pages)"
                    selectedFile={firstFile}
                    onFileSelect={setFirstFile}
                    formatBytes={formatBytes}
                    variant="first"
                  />
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="reverse-first"
                      checked={reverseFirstPdf}
                      onCheckedChange={(checked) => setReverseFirstPdf(checked === true)}
                    />
                    <Label htmlFor="reverse-first" className="text-sm cursor-pointer">
                      Reverse page order (if scanned face-up)
                    </Label>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleNextStep} disabled={!firstFile}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h2 className="guided-step-title">Upload Your Second PDF</h2>
                  <p className="guided-step-description">
                    This should contain your <strong>even pages</strong> (2, 4, 6, 8...)
                  </p>
                  <EvenPagesIllustration />
                  <FileDropZone
                    id="second-pdf"
                    label="Second PDF (Even Pages)"
                    selectedFile={secondFile}
                    onFileSelect={setSecondFile}
                    formatBytes={formatBytes}
                    variant="second"
                  />
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="reverse-second"
                      checked={reverseSecondPdf}
                      onCheckedChange={(checked) => setReverseSecondPdf(checked === true)}
                    />
                    <Label htmlFor="reverse-second" className="text-sm cursor-pointer">
                      Reverse page order (if scanned face-up)
                    </Label>
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handlePrevStep}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button onClick={handleNextStep} disabled={!secondFile}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <h2 className="guided-step-title">Ready to Merge</h2>
                  <p className="guided-step-description">
                    Your pages will be interleaved into a single document.
                  </p>
                  <MergeIllustration />

                  <div className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-2">Selected files:</p>
                      <p className="text-sm text-muted-foreground truncate">1. {firstFile?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">2. {secondFile?.name}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Page order:</p>
                      <div className="flex rounded-md border">
                        <Button
                          variant={order === "first_second" ? "default" : "ghost"}
                          className="rounded-none rounded-l-md flex-1"
                          onClick={() => setOrder("first_second")}
                        >
                          First → Second
                        </Button>
                        <Separator orientation="vertical" />
                        <Button
                          variant={order === "second_first" ? "default" : "ghost"}
                          className="rounded-none rounded-r-md flex-1"
                          onClick={() => setOrder("second_first")}
                        >
                          Second → First
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handlePrevStep}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="btn-gradient"
                      onClick={handleProcess}
                      disabled={!canProcess}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Process & Download
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ===== STREAMLINED MODE ===== */
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <p className="text-muted-foreground">
                Combine your odd and even page scans into one document
              </p>
            </div>

            {/* Upload Section */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-stretch">
              <div className="flex-1">
                <FileDropZone
                  id="first-pdf"
                  label="First PDF"
                  selectedFile={firstFile}
                  onFileSelect={setFirstFile}
                  formatBytes={formatBytes}
                  variant="first"
                />
              </div>

              {/* Swap button - centered between zones on desktop */}
              <div className="hidden md:flex items-center justify-center">
                <button
                  onClick={handleSwapFiles}
                  disabled={!firstFile && !secondFile}
                  className="swap-button-inline"
                  title="Swap files"
                  aria-label="Swap first and second PDF files"
                >
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1">
                <FileDropZone
                  id="second-pdf"
                  label="Second PDF"
                  selectedFile={secondFile}
                  onFileSelect={setSecondFile}
                  formatBytes={formatBytes}
                  variant="second"
                />
              </div>
            </div>

            {/* Reverse checkboxes */}
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reverse-first"
                  checked={reverseFirstPdf}
                  onCheckedChange={(checked) => setReverseFirstPdf(checked === true)}
                />
                <Label htmlFor="reverse-first" className="text-sm cursor-pointer">
                  Reverse first PDF page order
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reverse-second"
                  checked={reverseSecondPdf}
                  onCheckedChange={(checked) => setReverseSecondPdf(checked === true)}
                />
                <Label htmlFor="reverse-second" className="text-sm cursor-pointer">
                  Reverse second PDF page order
                </Label>
              </div>
            </div>

            {/* Mobile swap button */}
            <div className="flex justify-center mb-6 md:hidden">
              <Button
                variant="outline"
                onClick={handleSwapFiles}
                disabled={!firstFile && !secondFile}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Swap files
              </Button>
            </div>

            {/* Order selector and actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Order:</span>
                <div className="flex rounded-md border">
                  <Button
                    variant={order === "first_second" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none rounded-l-md"
                    onClick={() => setOrder("first_second")}
                  >
                    First → Second
                  </Button>
                  <Separator orientation="vertical" />
                  <Button
                    variant={order === "second_first" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none rounded-r-md"
                    onClick={() => setOrder("second_first")}
                  >
                    Second → First
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  className="btn-gradient px-6"
                  onClick={handleProcess}
                  disabled={!canProcess}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Process & Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-4 text-center">
        <a
          href="https://err0r.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          err0r.dev
        </a>
      </footer>

      {/* Floating Help Button */}
      <button
        onClick={handleToggleGuidedMode}
        className={`floating-help-button ${guidedMode ? "active" : ""}`}
        title={guidedMode ? "Exit guided mode" : "Need help? Try the step-by-step guide"}
        aria-label={guidedMode ? "Exit guided mode" : "Open step-by-step guide"}
        aria-pressed={guidedMode}
      >
        {guidedMode ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <>
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
            <span className="floating-help-label">Need help?</span>
          </>
        )}
      </button>

      {/* Filename Dialog */}
      <Dialog open={showFilenameDialog} onOpenChange={setShowFilenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name Your Output File</DialogTitle>
            <DialogDescription>
              Enter a filename for the interleaved PDF.
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
              variant="outline"
              onClick={() => setShowFilenameDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="btn-gradient"
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

      {/* Clear Logs Dialog */}
      <Dialog open={showClearLogsDialog} onOpenChange={setShowClearLogsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Logs?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {logs.length} processing log{logs.length === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowClearLogsDialog(false)}
              disabled={isClearingLogs}
            >
              Cancel
            </Button>
            <Button
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
                  Clear All
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
