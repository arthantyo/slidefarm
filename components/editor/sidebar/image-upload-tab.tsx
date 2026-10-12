'use client';

import { Upload } from 'lucide-react';

export function FileUpload({ onUpload }: { onUpload: (dataUrl: string) => void }) {
  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Click to upload an image</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onUpload(reader.result as string);
            reader.readAsDataURL(file);
          }}
        />
      </label>
    </div>
  );
}
