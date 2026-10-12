'use client';

import React from 'react';
import type { ShapeElement } from '@/types';

interface ShapeRendererProps {
  element: ShapeElement;
}

export function ShapeRenderer({ element }: ShapeRendererProps) {
  const { width, height, shape, fill, stroke, strokeWidth, cornerRadius, shadow } = element;

  const shadowCss = shadow
    ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
    : undefined;

  const strokeProps = strokeWidth > 0 && stroke
    ? { stroke, strokeWidth }
    : {};

  if (shape === 'rect') {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
        style={{ filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined }}
      >
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(1, width - strokeWidth)}
          height={Math.max(1, height - strokeWidth)}
          rx={cornerRadius}
          fill={fill}
          {...strokeProps}
        />
      </svg>
    );
  }

  if (shape === 'ellipse') {
    const rx = Math.max(1, (width - strokeWidth) / 2);
    const ry = Math.max(1, (height - strokeWidth) / 2);
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
        style={{ filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined }}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={rx}
          ry={ry}
          fill={fill}
          {...strokeProps}
        />
      </svg>
    );
  }

  if (shape === 'triangle') {
    const topX = width / 2;
    const topY = strokeWidth / 2;
    const rightX = width - strokeWidth / 2;
    const rightY = height - strokeWidth / 2;
    const leftX = strokeWidth / 2;
    const leftY = height - strokeWidth / 2;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
        style={{ filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined }}
      >
        <polygon
          points={`${topX},${topY} ${rightX},${rightY} ${leftX},${leftY}`}
          fill={fill}
          {...strokeProps}
        />
      </svg>
    );
  }

  if (shape === 'line') {
    const yCenter = height / 2;
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible select-none"
        style={{ filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined }}
      >
        <line
          x1={0}
          y1={yCenter}
          x2={width}
          y2={yCenter}
          stroke={fill || stroke || '#6366f1'}
          strokeWidth={strokeWidth || 4}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Star or regular polygon
  const sides = shape === 'star' ? 5 : element.sides ?? 5;
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.max(1, Math.min(width, height) / 2 - strokeWidth);

  let pointsStr = '';
  if (shape === 'star') {
    const innerR = outerR * 0.45;
    const totalPts = sides * 2;
    const points: string[] = [];
    for (let i = 0; i < totalPts; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / sides - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    pointsStr = points.join(' ');
  } else {
    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push(`${cx + outerR * Math.cos(angle)},${cy + outerR * Math.sin(angle)}`);
    }
    pointsStr = points.join(' ');
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible select-none"
      style={{ filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined }}
    >
      <polygon points={pointsStr} fill={fill} {...strokeProps} />
    </svg>
  );
}
