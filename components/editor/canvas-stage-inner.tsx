'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Rect, Image as KonvaImage, Ellipse, Line, RegularPolygon, Transformer } from 'react-konva';
import useImage from 'use-image';
import type {
  CanvasElement, TextElement, ImageElement, ShapeElement,
  BackgroundElement, Slide, Theme,
} from '@/types';

interface ElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<CanvasElement>) => void;
}

// ─── Text Element ────────────────────────────────────────────────────────────

function KonvaTextElement({ element, isSelected, onSelect, onChange }: ElementProps) {
  const textRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const el = element as TextElement;

  useEffect(() => {
    if (transformerRef.current && textRef.current) {
      if (isSelected) {
        transformerRef.current.nodes([textRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [isSelected]);

  const fontStyle = el.fontStyle === 'bold-italic' ? 'bold italic'
    : el.fontStyle === 'bold' ? 'bold'
    : el.fontStyle === 'italic' ? 'italic'
    : 'normal';

  return (
    <>
      <Text
        ref={textRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        text={el.text}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fontStyle={fontStyle}
        textDecoration={el.textDecoration}
        fill={el.fill}
        align={el.align}
        verticalAlign={el.verticalAlign}
        lineHeight={el.lineHeight}
        letterSpacing={el.letterSpacing}
        wrap={el.wrap}
        padding={el.padding}
        rotation={el.rotation}
        opacity={el.opacity}
        visible={el.visible}
        draggable={!el.locked}
        shadowColor={el.shadow?.color}
        shadowBlur={el.shadow?.blur}
        shadowOffsetX={el.shadow?.offsetX}
        shadowOffsetY={el.shadow?.offsetY}
        shadowOpacity={el.shadow?.opacity}
        onClick={() => onSelect(el.id)}
        onTap={() => onSelect(el.id)}
        onDragEnd={(e: any) => onChange(el.id, { x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e: any) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange(el.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
          anchorSize={8}
          anchorCornerRadius={4}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          boundBoxFunc={(oldBox: any, newBox: any) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// ─── Image Element ───────────────────────────────────────────────────────────

function KonvaImageElement({ element, isSelected, onSelect, onChange }: ElementProps) {
  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const el = element as ImageElement;
  const [img] = useImage(el.src, 'anonymous');

  useEffect(() => {
    if (transformerRef.current && imageRef.current) {
      if (isSelected) {
        transformerRef.current.nodes([imageRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [isSelected]);

  let crop: any = undefined;
  if (img) {
    const imgRatio = img.width / img.height;
    const elRatio = el.width / el.height;
    if (el.objectFit === 'cover') {
      if (imgRatio > elRatio) {
        const cropH = img.height;
        const cropW = cropH * elRatio;
        crop = { x: (img.width - cropW) / 2, y: 0, width: cropW, height: cropH };
      } else {
        const cropW = img.width;
        const cropH = cropW / elRatio;
        crop = { x: 0, y: (img.height - cropH) / 2, width: cropW, height: cropH };
      }
    }
  }

  return (
    <>
      <KonvaImage
        ref={imageRef}
        id={el.id}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        image={img}
        crop={crop}
        cornerRadius={el.cornerRadius}
        rotation={el.rotation}
        opacity={el.opacity}
        visible={el.visible}
        draggable={!el.locked}
        shadowColor={el.shadow?.color}
        shadowBlur={el.shadow?.blur}
        shadowOffsetX={el.shadow?.offsetX}
        shadowOffsetY={el.shadow?.offsetY}
        shadowOpacity={el.shadow?.opacity}
        onClick={() => onSelect(el.id)}
        onTap={() => onSelect(el.id)}
        onDragEnd={(e: any) => onChange(el.id, { x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e: any) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange(el.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          anchorSize={8}
          anchorCornerRadius={4}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          boundBoxFunc={(oldBox: any, newBox: any) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// ─── Shape Element ───────────────────────────────────────────────────────────

function KonvaShapeElement({ element, isSelected, onSelect, onChange }: ElementProps) {
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const el = element as ShapeElement;

  useEffect(() => {
    if (transformerRef.current && shapeRef.current) {
      if (isSelected) {
        transformerRef.current.nodes([shapeRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [isSelected]);

  const commonProps = {
    id: el.id,
    rotation: el.rotation,
    opacity: el.opacity,
    visible: el.visible,
    draggable: !el.locked,
    shadowColor: el.shadow?.color,
    shadowBlur: el.shadow?.blur,
    shadowOffsetX: el.shadow?.offsetX,
    shadowOffsetY: el.shadow?.offsetY,
    shadowOpacity: el.shadow?.opacity,
    onClick: () => onSelect(el.id),
    onTap: () => onSelect(el.id),
    onDragEnd: (e: any) => onChange(el.id, { x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange(el.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(10, el.width * scaleX),
        height: Math.max(10, el.height * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  let shape: React.ReactNode;
  switch (el.shape) {
    case 'rect':
      shape = (
        <Rect
          ref={shapeRef}
          {...commonProps}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          fill={el.fill}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth}
          cornerRadius={el.cornerRadius}
        />
      );
      break;
    case 'ellipse':
      shape = (
        <Ellipse
          ref={shapeRef}
          {...commonProps}
          x={el.x + el.width / 2}
          y={el.y + el.height / 2}
          radiusX={el.width / 2}
          radiusY={el.height / 2}
          fill={el.fill}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth}
        />
      );
      break;
    case 'triangle':
      shape = (
        <RegularPolygon
          ref={shapeRef}
          {...commonProps}
          x={el.x + el.width / 2}
          y={el.y + el.height / 2}
          sides={3}
          radius={Math.min(el.width, el.height) / 2}
          fill={el.fill}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth}
        />
      );
      break;
    case 'star':
    case 'polygon':
      shape = (
        <RegularPolygon
          ref={shapeRef}
          {...commonProps}
          x={el.x + el.width / 2}
          y={el.y + el.height / 2}
          sides={el.sides ?? 5}
          radius={Math.min(el.width, el.height) / 2}
          fill={el.fill}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth}
        />
      );
      break;
    case 'line':
      shape = (
        <Line
          ref={shapeRef}
          {...commonProps}
          x={el.x}
          y={el.y}
          points={el.points ?? [0, el.height / 2, el.width, el.height / 2]}
          stroke={el.fill}
          strokeWidth={el.strokeWidth || 4}
          lineCap="round"
        />
      );
      break;
    default:
      shape = (
        <Rect
          ref={shapeRef}
          {...commonProps}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          fill={el.fill}
          stroke={el.stroke || undefined}
          strokeWidth={el.strokeWidth}
          cornerRadius={el.cornerRadius}
        />
      );
  }

  return (
    <>
      {shape}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          anchorSize={8}
          anchorCornerRadius={4}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          boundBoxFunc={(oldBox: any, newBox: any) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

// ─── Background Element ──────────────────────────────────────────────────────

function KonvaBackgroundElement({ element }: { element: BackgroundElement }) {
  const el = element;

  if (el.fillType === 'gradient' && el.gradientColor2) {
    const angle = (el.gradientAngle ?? 135) * Math.PI / 180;
    return (
      <Rect
        x={0}
        y={0}
        width={el.width}
        height={el.height}
        listening={false}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{
          x: el.width * Math.cos(angle),
          y: el.height * Math.sin(angle),
        }}
        fillLinearGradientColorStops={[0, el.fill, 1, el.gradientColor2]}
      />
    );
  }

  return (
    <Rect
      x={0}
      y={0}
      width={el.width}
      height={el.height}
      listening={false}
      fill={el.fill}
    />
  );
}

// ─── Canvas Stage ────────────────────────────────────────────────────────────

interface CanvasStageProps {
  slide: Slide;
  width: number;
  height: number;
  theme: Theme;
  zoom: number;
  selectedElementIds: string[];
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeselectAll: () => void;
}

export default function CanvasStage({
  slide, width, height, zoom,
  selectedElementIds, onSelectElement, onUpdateElement, onDeselectAll,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const canvasWidth = width * zoom;
  const canvasHeight = height * zoom;
  const offsetX = Math.max(0, (stageSize.width - canvasWidth) / 2);
  const offsetY = Math.max(0, (stageSize.height - canvasHeight) / 2);

  const background = slide.elements.find((el) => el.type === 'background') as BackgroundElement | undefined;
  const otherElements = slide.elements.filter((el) => el.type !== 'background');

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-auto">
      <Stage
        width={canvasWidth}
        height={canvasHeight}
        x={offsetX}
        y={offsetY}
        scaleX={zoom}
        scaleY={zoom}
        onMouseDown={(e: any) => {
          if (e.target === e.target.getStage()) {
            onDeselectAll();
          }
        }}
        style={{ background: 'transparent' }}
      >
        <Layer>
          {background && <KonvaBackgroundElement element={background} />}
          {otherElements.map((element) => {
            const isSelected = selectedElementIds.includes(element.id);
            const props = {
              key: element.id,
              element,
              isSelected,
              onSelect: onSelectElement,
              onChange: onUpdateElement,
            };

            if (element.type === 'text') return <KonvaTextElement {...props} />;
            if (element.type === 'image') return <KonvaImageElement {...props} />;
            if (element.type === 'shape') return <KonvaShapeElement {...props} />;
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
