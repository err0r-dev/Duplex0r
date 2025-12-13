import type { ChangeEvent, DragEvent } from "react";
import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropZoneProps = {
  id: string;
  label: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  formatBytes: (bytes: number) => string;
  variant?: "first" | "second";
};

export function FileDropZone({
  id,
  label,
  selectedFile,
  onFileSelect,
  formatBytes,
  variant = "first",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        onFileSelect(file);
      } else {
        alert("Please select a PDF file.");
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      onFileSelect(file);
    } else if (file) {
      alert("Please select a PDF file.");
      e.target.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const variantClass = variant === "first" ? "drop-zone-first" : "drop-zone-second";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "drop-zone",
          variantClass,
          isDragging && "is-dragging",
          selectedFile && "has-file"
        )}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="sr-only"
        />
        <div className="drop-zone-icon">
          {selectedFile ? (
            <FileText className="h-7 w-7 text-muted-foreground" />
          ) : (
            <Upload className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        {selectedFile ? (
          <div className="text-center">
            <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(selectedFile.size)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Click to change file
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">Drop PDF here</p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
