import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface UploadResult {
  successful: Array<{ name: string; uploadURL?: string }>;
  failed: Array<{ name: string; error?: string }>;
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file: { name: string; size: number; type: string }) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (result: UploadResult) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const successful: UploadResult["successful"] = [];
    const failed: UploadResult["failed"] = [];

    for (let i = 0; i < Math.min(files.length, maxNumberOfFiles); i++) {
      const file = files[i];
      if (file.size > maxFileSize) {
        failed.push({ name: file.name, error: "File too large" });
        continue;
      }
      try {
        const params = await onGetUploadParameters({ name: file.name, size: file.size, type: file.type });
        const res = await fetch(params.url, {
          method: params.method,
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream", ...params.headers },
        });
        if (!res.ok) throw new Error("Upload failed");
        successful.push({ name: file.name, uploadURL: params.url });
      } catch (err: any) {
        failed.push({ name: file.name, error: err?.message || "Upload failed" });
      }
    }

    setIsUploading(false);
    onComplete?.({ successful, failed });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple={maxNumberOfFiles > 1}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        className={buttonClassName}
        disabled={isUploading}
      >
        {isUploading ? "جاري الرفع..." : children}
      </Button>
    </div>
  );
}
