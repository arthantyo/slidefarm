export interface GuideLine {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
  origin: 'canvas' | 'element';
  label?: string;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: GuideLine[];
  snappedX: boolean;
  snappedY: boolean;
  snapLabelX?: string;
  snapLabelY?: string;
}

export interface ResizeSnapResult {
  x: number;
  y: number;
  width: number;
  height: number;
  guides: GuideLine[];
  snappedX: boolean;
  snappedY: boolean;
  snapLabelX?: string;
  snapLabelY?: string;
}
