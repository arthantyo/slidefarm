'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COLOR_PALETTE } from '@/lib/canvas/themes';

export function StyleButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border text-muted-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-border"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 flex-1 text-xs font-mono"
        />
      </div>
      <div className="grid grid-cols-8 gap-1">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="aspect-square rounded border border-border transition-transform hover:scale-110"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
