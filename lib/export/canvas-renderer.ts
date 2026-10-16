import type {
  Slide,
  CanvasElement,
  BackgroundElement,
  TextElement,
  ImageElement,
  ShapeElement,
} from "@/types";
import { getWrappedLines } from "./text-wrap";
import { loadFont } from "../font-loader";
import { getTextFontWeight, isTextItalic } from "../canvas/text-style";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function renderSlideToCanvas(
  slide: Slide,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<void> {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background
  const bg = slide.elements.find((el) => el.type === "background") as
    | BackgroundElement
    | undefined;
  if (bg) {
    if (bg.fillType === "gradient" && bg.gradientColor2) {
      const angleRad = ((bg.gradientAngle ?? 135) * Math.PI) / 180;
      const x2 = width * Math.cos(angleRad);
      const y2 = height * Math.sin(angleRad);
      const grad = ctx.createLinearGradient(0, 0, x2, y2);
      grad.addColorStop(0, bg.fill);
      grad.addColorStop(1, bg.gradientColor2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg.fill || "#ffffff";
    }
    ctx.fillRect(0, 0, width, height);
    if (bg.fillType === 'image' && bg.imageSrc) {
      const image = await loadImage(bg.imageSrc);
      const scale = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }
  }

  // 2. Preload all visible images
  const otherElements = slide.elements.filter(
    (el) => el.type !== "background" && el.visible,
  );
  await Promise.all(
    otherElements
      .filter((el): el is TextElement => el.type === "text")
      .map((el) => {
        return loadFont(
          el.fontFamily,
          getTextFontWeight(el),
          isTextItalic(el) ? "italic" : "normal",
        ).catch(() => undefined);
      }),
  );
  const imageElements = otherElements.filter(
    (el) => el.type === "image",
  ) as ImageElement[];
  const loadedImages = new Map<string, HTMLImageElement>();

  await Promise.all(
    imageElements.map(async (el) => {
      try {
        const img = await loadImage(el.src);
        loadedImages.set(el.id, img);
      } catch {
        // Continue even if an image fails to load
      }
    }),
  );

  // 3. Draw Elements in order
  for (const el of otherElements) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    // Apply rotation around element center
    if (el.rotation) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (el.type === "text") {
      renderTextElement(ctx, el as TextElement);
    } else if (el.type === "image") {
      renderImageElement(ctx, el as ImageElement, loadedImages.get(el.id));
    } else if (el.type === "shape") {
      renderShapeElement(ctx, el as ShapeElement);
    }

    ctx.restore();
  }
}

function renderTextElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  const fontWeight = getTextFontWeight(el);
  const fontStyle = isTextItalic(el) ? "italic" : "normal";

  ctx.font = `${fontStyle} ${fontWeight} ${el.fontSize}px "${el.fontFamily}", sans-serif`;
  ctx.fillStyle = el.fill;
  const hasStroke = (el.strokeWidth ?? 0) > 0;
  if (hasStroke) {
    ctx.strokeStyle = el.stroke ?? "#000000";
    ctx.lineWidth = el.strokeWidth!;
    ctx.lineJoin = "round";
  }

  if (el.shadow) {
    ctx.shadowColor = el.shadow.color;
    ctx.shadowBlur = el.shadow.blur;
    ctx.shadowOffsetX = el.shadow.offsetX;
    ctx.shadowOffsetY = el.shadow.offsetY;
  }

  const padding = el.padding || 0;
  const maxWidth = Math.max(10, el.width - padding * 2);

  // Calculate wrapped lines with 1:1 match
  const lines = getWrappedLines(
    el.text,
    maxWidth,
    el.fontFamily,
    el.fontSize,
    String(fontWeight),
    fontStyle,
    el.letterSpacing,
  );

  const lineHeightPx = el.fontSize * (el.lineHeight || 1.3);
  const totalTextHeight = lines.length * lineHeightPx;
  const availableHeight = Math.max(10, el.height - padding * 2);

  let startY = el.y + padding;
  if (el.verticalAlign === "middle") {
    startY = el.y + padding + (availableHeight - totalTextHeight) / 2;
  } else if (el.verticalAlign === "bottom") {
    startY = el.y + el.height - padding - totalTextHeight;
  }

  ctx.textBaseline = "top";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineW = ctx.measureText(line).width + Math.max(0, line.length - 1) * el.letterSpacing;

    let lineX = el.x + padding;
    if (el.align === "center") {
      lineX = el.x + padding + (maxWidth - lineW) / 2;
    } else if (el.align === "right") {
      lineX = el.x + el.width - padding - lineW;
    }

    const lineY = startY + i * lineHeightPx;
    if (el.letterSpacing === 0) {
      if (hasStroke) ctx.strokeText(line, lineX, lineY);
      ctx.fillText(line, lineX, lineY);
    } else {
      let characterX = lineX;
      for (const character of line) {
        if (hasStroke) ctx.strokeText(character, characterX, lineY);
        ctx.fillText(character, characterX, lineY);
        characterX += ctx.measureText(character).width + el.letterSpacing;
      }
    }

    if (el.textDecoration === "underline") {
      ctx.fillRect(
        lineX,
        lineY + el.fontSize * 1.05,
        lineW,
        Math.max(1, el.fontSize * 0.07),
      );
    } else if (el.textDecoration === "line-through") {
      ctx.fillRect(
        lineX,
        lineY + el.fontSize * 0.55,
        lineW,
        Math.max(1, el.fontSize * 0.07),
      );
    }
  }
}

function renderImageElement(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
  img?: HTMLImageElement,
) {
  if (!img) return;

  ctx.save();
  if (el.cornerRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(el.x, el.y, el.width, el.height, el.cornerRadius);
    ctx.clip();
  }

  if (el.objectFit === "contain") {
    const scale = Math.min(
      el.width / img.naturalWidth,
      el.height / img.naturalHeight,
    );
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = el.x + (el.width - dw) / 2;
    const dy = el.y + (el.height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else if (el.objectFit === "cover") {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = el.width / el.height;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imgRatio > boxRatio) {
      sw = img.naturalHeight * boxRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / boxRatio;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, el.x, el.y, el.width, el.height);
  } else {
    ctx.drawImage(img, el.x, el.y, el.width, el.height);
  }
  ctx.restore();
}

function renderShapeElement(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.fillStyle = el.fill;
  if (el.strokeWidth > 0 && el.stroke) {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.strokeWidth;
  }

  ctx.beginPath();
  if (el.shape === "rect") {
    if (el.cornerRadius > 0) {
      ctx.roundRect(el.x, el.y, el.width, el.height, el.cornerRadius);
    } else {
      ctx.rect(el.x, el.y, el.width, el.height);
    }
  } else if (el.shape === "ellipse") {
    ctx.ellipse(
      el.x + el.width / 2,
      el.y + el.height / 2,
      el.width / 2,
      el.height / 2,
      0,
      0,
      2 * Math.PI,
    );
  } else if (el.shape === "triangle") {
    ctx.moveTo(el.x + el.width / 2, el.y);
    ctx.lineTo(el.x + el.width, el.y + el.height);
    ctx.lineTo(el.x, el.y + el.height);
    ctx.closePath();
  } else if (el.shape === "line") {
    ctx.moveTo(el.x, el.y + el.height / 2);
    ctx.lineTo(el.x + el.width, el.y + el.height / 2);
    ctx.strokeStyle = el.fill || el.stroke || "#6366f1";
    ctx.lineWidth = el.strokeWidth || 4;
    ctx.lineCap = "round";
    ctx.stroke();
    return;
  } else {
    // Star or regular polygon
    const sides = el.shape === "star" ? 5 : (el.sides ?? 5);
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const outerR = Math.min(el.width, el.height) / 2;
    const innerR = outerR * 0.45;
    const count = el.shape === "star" ? sides * 2 : sides;

    for (let i = 0; i < count; i++) {
      const r = el.shape === "star" ? (i % 2 === 0 ? outerR : innerR) : outerR;
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  ctx.fill();
  if (el.strokeWidth > 0 && el.stroke) {
    ctx.stroke();
  }
}
