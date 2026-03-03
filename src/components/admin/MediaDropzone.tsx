"use client";
import { useState, useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { adminUploadImage } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

interface MediaDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  stationId: string;
  stepId?: string;
}

export function MediaDropzone({
  value,
  onChange,
  stationId,
  stepId = "new",
}: MediaDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setIsUploading(true);
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 12, 88));
      }, 150);

      try {
        const data = await adminUploadImage(file, stationId, stepId);
        clearInterval(interval);
        setProgress(100);
        onChange(data.url as string);
        setTimeout(() => {
          setIsUploading(false);
          setProgress(0);
        }, 600);
      } catch {
        clearInterval(interval);
        setIsUploading(false);
        setProgress(0);
      }
    },
    [stationId, stepId, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 text-center select-none",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        {isUploading ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Enviando... {progress}%</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Upload className="h-10 w-10" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">
                Arrastra una imagen aqui o haz clic para seleccionar
              </p>
              <p className="text-xs mt-1">JPEG, PNG, WebP — max. 10 MB</p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {value && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Vista previa"
            className="rounded-lg border max-h-36 object-cover shadow-sm"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 shadow"
            aria-label="Eliminar imagen"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
