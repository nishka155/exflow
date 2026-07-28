"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2, FileUp } from "lucide-react";

import { cn } from "@/lib/utils";

export function DocumentUploader({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);

  function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(`Uploaded ${file.name}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !pending && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
        isDragging
          ? "border-brand bg-brand/5"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
        pending && "pointer-events-none opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={pending}
        onChange={handleFileInputChange}
      />
      {pending ? (
        <>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Uploading…</p>
        </>
      ) : isDragging ? (
        <>
          <FileUp className="size-6 text-brand" />
          <p className="text-sm font-medium text-brand">Drop to upload</p>
        </>
      ) : (
        <>
          <UploadCloud className="size-6 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium text-foreground">Click to upload</span>{" "}
            <span className="text-muted-foreground">or drag and drop</span>
          </p>
          <p className="text-xs text-muted-foreground">PDF, images, or documents</p>
        </>
      )}
    </div>
  );
}
