"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentUploader({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(`Uploaded ${file.name}`);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input ref={inputRef} type="file" className="max-w-xs" disabled={pending} />
      <Button type="button" variant="outline" disabled={pending} onClick={handleUpload}>
        <Upload />
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
