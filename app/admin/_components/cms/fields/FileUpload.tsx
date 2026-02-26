"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/forms/InputGroup";
import { Loader2, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  linkId: string;
  currentIconUrl?: string | null;
  onUploadComplete: (url: string) => void;
  disabled?: boolean;
}

export default function FileUpload({
  currentIconUrl,
  onUploadComplete,
  disabled = false,
}: FileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (file: File) => {
    setIsUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-icon", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload icon");
      }

      const { url } = await response.json();

      onUploadComplete(url);

      toast({
        title: "Success",
        description: "Icon uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to upload icon",
        variant: "destructive",
      });
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <InputGroup className="md:max-w-[72ch]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleIconUpload(file);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled || isUploading}
            className="border-0 shadow-none h-auto py-1.5 px-3 rounded-r-none"
          >
            Choose File
          </Button>
          <div
            className="flex items-center gap-1.5 text-sm text-muted-foreground px-2 flex-1 min-w-0 cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="truncate">Uploading...</span>
              </>
            ) : currentIconUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentIconUrl}
                  alt="Icon preview"
                  className="w-4 h-4 object-cover rounded-full shrink-0"
                />
                <span className="truncate">{fileName || "Icon uploaded"}</span>
              </>
            ) : (
              <>
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">No file chosen</span>
              </>
            )}
          </div>
          <InputGroupAddon
            align="inline-end"
            className="text-xs whitespace-nowrap"
          >
            Max 2MB
          </InputGroupAddon>
        </InputGroup>
    </div>
  );
}
