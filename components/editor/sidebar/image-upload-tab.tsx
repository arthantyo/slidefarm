'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface ImageUploadTabProps {
  onAddImage: (url: string) => void;
}

export function ImageUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');
  return (
    <div className="space-y-2">
      <Input
        placeholder="https://example.com/image.png"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="text-xs"
      />
      <Button
        size="sm"
        className="w-full text-xs"
        disabled={!url.trim()}
        onClick={() => {
          onAdd(url.trim());
          setUrl('');
        }}
      >
        Add Image to Slide
      </Button>
    </div>
  );
}

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
