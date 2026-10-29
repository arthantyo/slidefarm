'use client';

import { memo } from 'react';
import type { Slide, Theme, CanvasElement, BackgroundElement, TextElement, ShapeElement, ImageElement } from '@/types';
import { getTextFontWeight, isTextItalic } from '@/lib/canvas/text-style';
import { elementsInLayerOrder } from '@/lib/canvas/layers';
import { getImageFilterCss } from '@/lib/canvas/image-filters';

interface SlideThumbnailProps {
  slide: Slide;
  width: number;
  height: number;
  theme: Theme;
  maxWidth?: number;
  maxHeight?: number;
  fit?: 'contain' | 'cover';
  className?: string;
}

function getBackgroundStyle(el: BackgroundElement, width: number, height: number): React.CSSProperties {
  if (el.fillType === 'image' && el.imageSrc) return { backgroundColor: el.fill, backgroundImage: `url(${el.imageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (el.fillType === 'gradient' && el.gradientColor2) {
    const angle = el.gradientAngle ?? 135;
    return {
      background: `linear-gradient(${angle}deg, ${el.fill}, ${el.gradientColor2})`,
    };
  }
  return { background: el.fill };
}

function renderElement(el: CanvasElement, key: string, scale: number): React.ReactNode {
  if (!el.visible) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: el.x * scale,
    top: el.y * scale,
    width: el.width * scale,
    height: el.height * scale,
    transform: `rotate(${el.rotation}deg)`,
    opacity: el.opacity,
  };

  if (el.type === 'background') {
    return (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          ...getBackgroundStyle(el as BackgroundElement, el.width, el.height),
        }}
      />
    );
  }

  if (el.type === 'text') {
    const t = el as TextElement;
    return (
      <div
        key={key}
        style={{
          ...baseStyle,
          display: 'flex',
          alignItems: t.verticalAlign === 'middle' ? 'center' : t.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
          justifyContent: t.align === 'center' ? 'center' : t.align === 'right' ? 'flex-end' : 'flex-start',
          color: t.fill,
          WebkitTextStroke: t.strokeWidth ? `${t.strokeWidth * scale}px ${t.stroke ?? '#000000'}` : undefined,
          paintOrder: 'stroke fill',
          fontSize: t.fontSize * scale,
          fontFamily: t.fontFamily,
          fontStyle: isTextItalic(t) ? 'italic' : 'normal',
          fontWeight: getTextFontWeight(t),
          textDecoration: t.textDecoration,
          lineHeight: t.lineHeight,
          letterSpacing: `${t.letterSpacing * scale}px`,
          textAlign: t.align as React.CSSProperties['textAlign'],
          padding: t.padding * scale,
          wordBreak: 'break-word',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {t.text}
      </div>
    );
  }

  if (el.type === 'image') {
    const img = el as ImageElement;
    return (
      <div
        key={key}
        style={{
          ...baseStyle,
          backgroundImage: `url(${img.src})`,
          backgroundSize: img.objectFit === 'cover' ? 'cover' : img.objectFit === 'contain' ? 'contain' : '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: img.cornerRadius * scale,
          filter: getImageFilterCss(img.filters),
        }}
      />
    );
  }

  if (el.type === 'shape') {
    const s = el as ShapeElement;
    const shapeStyle: React.CSSProperties = {
      ...baseStyle,
      background: s.fill,
      border: s.strokeWidth > 0 ? `${s.strokeWidth * scale}px solid ${s.stroke}` : undefined,
      borderRadius: s.shape === 'rect' || s.shape === 'line' ? s.cornerRadius * scale : s.shape === 'ellipse' ? '50%' : 0,
    };

    if (s.shape === 'ellipse') {
      shapeStyle.borderRadius = '50%';
    } else if (s.shape === 'triangle') {
      return (
        <div
          key={key}
          style={{
            ...baseStyle,
            width: 0,
            height: 0,
            borderLeft: `${s.width * scale / 2}px solid transparent`,
            borderRight: `${s.width * scale / 2}px solid transparent`,
            borderBottom: `${s.height * scale}px solid ${s.fill}`,
          }}
        />
      );
    } else if (s.shape === 'line') {
      return (
        <div
          key={key}
          style={{
            ...baseStyle,
            background: s.fill,
            height: (s.strokeWidth || 4) * scale,
          }}
        />
      );
    }

    return <div key={key} style={shapeStyle} />;
  }

  return null;
}

function SlideThumbnailBase({ slide, width, height, theme, maxWidth = 200, maxHeight = 300, fit = 'contain', className }: SlideThumbnailProps) {
  const scale = fit === 'cover'
    ? Math.max(maxWidth / width, maxHeight / height)
    : Math.min(maxWidth / width, maxHeight / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: scaledWidth,
        height: scaledHeight,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      {elementsInLayerOrder(slide.elements).map((el) => renderElement(el, el.id, scale))}
    </div>
  );
}

export const SlideThumbnail = memo(SlideThumbnailBase);
