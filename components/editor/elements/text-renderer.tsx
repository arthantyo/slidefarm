"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { TextElement } from "@/types";
import { loadFont } from "@/lib/font-loader";
import { getTextFontWeight, isTextItalic } from "@/lib/canvas/text-style";

interface TextRendererProps {
  element: TextElement;
  isSelected: boolean;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
}

export function TextRenderer({
  element,
  isSelected,
  isEditing,
  onEditStart,
  onEditEnd,
  onUpdate,
}: TextRendererProps) {
  const [editText, setEditText] = useState(element.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextRef = useRef(editText);
  const onUpdateRef = useRef(onUpdate);
  const committedTextRef = useRef(element.text);
  const blurTimerRef = useRef<number | null>(null);
  const unmountingRef = useRef(false);
  const { fontFamily, fontStyle, fontWeight } = element;

  editTextRef.current = editText;
  onUpdateRef.current = onUpdate;

  useLayoutEffect(() => {
    unmountingRef.current = false;
    return () => {
      unmountingRef.current = true;
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEditing) setEditText(element.text);
  }, [element.text, isEditing]);

  useEffect(() => {
    void loadFont(
      fontFamily,
      fontWeight ?? (fontStyle === "bold" || fontStyle === "bold-italic" ? 700 : 400),
      fontStyle === "italic" || fontStyle === "bold-italic" ? "italic" : "normal",
    ).catch(() => undefined);
  }, [fontFamily, fontStyle, fontWeight]);

  useEffect(() => {
    if (!isEditing) return;
    committedTextRef.current = element.text;
    const el = textareaRef.current;
    const focusId = window.setTimeout(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, el.value.length);
    }, 0);
    return () => {
      window.clearTimeout(focusId);
      const next = editTextRef.current;
      if (next === committedTextRef.current) return;
      committedTextRef.current = next;
      onUpdateRef.current({ text: next });
    };
    // Capture the text from when this edit session opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const finishEditing = () => {
    if (unmountingRef.current) return;
    const next = editTextRef.current;
    if (next !== committedTextRef.current) {
      committedTextRef.current = next;
      onUpdate({ text: next });
    }
    onEditEnd();
  };

  const shadowCss = element.shadow
    ? `${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color}`
    : undefined;

  const style: React.CSSProperties = {
    color: element.fill,
    fontSize: `${element.fontSize}px`,
    fontFamily: element.fontFamily,
    fontWeight: getTextFontWeight(element),
    fontStyle: isTextItalic(element) ? "italic" : "normal",
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
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.currentTarget.setSelectionRange(0, e.currentTarget.value.length);
          }}
          onBlur={() => {
            if (unmountingRef.current) return;
            blurTimerRef.current = window.setTimeout(() => {
              blurTimerRef.current = null;
              if (unmountingRef.current) return;
              if (!textareaRef.current?.isConnected) return;
              if (document.activeElement === textareaRef.current) return;
              finishEditing();
            }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              finishEditing();
            }
          }}
          className="h-full w-full cursor-text resize-none select-text border-none bg-transparent outline-none ring-0 selection:bg-primary/30"
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
        if (!element.locked) onEditStart();
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
