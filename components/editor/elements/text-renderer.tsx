"use client";

import React, { useState, useRef, useEffect } from "react";
import type { TextElement } from "@/types";
import { loadFont } from "@/lib/font-loader";

interface TextRendererProps {
  element: TextElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<TextElement>) => void;
}

export function TextRenderer({
  element,
  isSelected,
  onUpdate,
}: TextRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(element.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(element.text);
  }, [element.text]);

  useEffect(() => {
    const isBold =
      element.fontStyle === "bold" || element.fontStyle === "bold-italic";
    const isItalic =
      element.fontStyle === "italic" || element.fontStyle === "bold-italic";
    void loadFont(
      element.fontFamily,
      isBold ? "bold" : "normal",
      isItalic ? "italic" : "normal",
    ).catch(() => undefined);
  }, [element.fontFamily, element.fontStyle]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleFinishEditing = () => {
    setIsEditing(false);
    if (editText !== element.text) {
      onUpdate({ text: editText });
    }
  };

  const isBold =
    element.fontStyle === "bold" || element.fontStyle === "bold-italic";
  const isItalic =
    element.fontStyle === "italic" || element.fontStyle === "bold-italic";

  const shadowCss = element.shadow
    ? `${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color}`
    : undefined;

  const style: React.CSSProperties = {
    color: element.fill,
    fontSize: `${element.fontSize}px`,
    fontFamily: element.fontFamily,
    fontWeight: isBold ? "bold" : "normal",
    fontStyle: isItalic ? "italic" : "normal",
    textDecoration: element.textDecoration,
    textAlign: element.align,
    lineHeight: element.lineHeight,
    letterSpacing: `${element.letterSpacing}px`,
    padding: `${element.padding}px`,
    textShadow: shadowCss,
    whiteSpace: "pre-wrap",
    wordBreak: element.wrap === "word" ? "break-word" : "normal",
  };

  const verticalAlignClass =
    element.verticalAlign === "middle"
      ? "items-center"
      : element.verticalAlign === "bottom"
        ? "items-end"
        : "items-start";

  if (isEditing) {
    return (
      <div className={`flex h-full w-full ${verticalAlignClass}`}>
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleFinishEditing}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              handleFinishEditing();
            }
          }}
          className="h-full w-full resize-none border-none bg-transparent outline-none ring-0 selection:bg-primary/30"
          style={style}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!element.locked) {
          setIsEditing(true);
        }
      }}
      className={`flex h-full w-full select-none overflow-hidden ${verticalAlignClass}`}
      style={{
        justifyContent:
          element.align === "center"
            ? "center"
            : element.align === "right"
              ? "flex-end"
              : "flex-start",
      }}
      title={isSelected ? "Double-click to edit text" : undefined}
    >
      <div style={style} className="w-full">
        {element.text || (
          <span className="opacity-40">Double-click to edit</span>
        )}
      </div>
    </div>
  );
}
