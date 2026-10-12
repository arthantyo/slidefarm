/**
 * Helper to calculate pixel-accurate word wrapped lines matching CSS wrap behavior.
 */

let measurementCanvas: HTMLCanvasElement | null = null;
let measurementCtx: CanvasRenderingContext2D | null = null;

function getMeasurementContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measurementCanvas) {
    measurementCanvas = document.createElement('canvas');
    measurementCtx = measurementCanvas.getContext('2d');
  }
  return measurementCtx;
}

function measureTextWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight = 'normal',
  fontStyle = 'normal',
  letterSpacing = 0
): number {
  const ctx = getMeasurementContext();
  if (!ctx) {
    // Fallback approximation if run in non-DOM environment
    return text.length * fontSize * 0.6 + text.length * letterSpacing;
  }

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  const metrics = ctx.measureText(text);
  return metrics.width + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
}

export function getWrappedLines(
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  fontWeight = 'normal',
  fontStyle = 'normal',
  letterSpacing = 0
): string[] {
  if (!text) return [''];
  if (maxWidth <= 0) return [text];

  const paragraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      resultLines.push('');
      continue;
    }

    // Split into words while keeping whitespace tokens
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureTextWidth(
        testLine,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        letterSpacing
      );

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = word;

          // If the single word itself exceeds maxWidth, break it by character
          const singleWordWidth = measureTextWidth(
            word,
            fontFamily,
            fontSize,
            fontWeight,
            fontStyle,
            letterSpacing
          );
          if (singleWordWidth > maxWidth) {
            let charAcc = '';
            for (const ch of word) {
              const testCharLine = charAcc + ch;
              if (
                measureTextWidth(
                  testCharLine,
                  fontFamily,
                  fontSize,
                  fontWeight,
                  fontStyle,
                  letterSpacing
                ) <= maxWidth
              ) {
                charAcc = testCharLine;
              } else {
                if (charAcc) resultLines.push(charAcc);
                charAcc = ch;
              }
            }
            currentLine = charAcc;
          }
        } else {
          // First word is already too wide, break by character
          let charAcc = '';
          for (const ch of word) {
            const testCharLine = charAcc + ch;
            if (
              measureTextWidth(
                testCharLine,
                fontFamily,
                fontSize,
                fontWeight,
                fontStyle,
                letterSpacing
              ) <= maxWidth
            ) {
              charAcc = testCharLine;
            } else {
              if (charAcc) resultLines.push(charAcc);
              charAcc = ch;
            }
          }
          currentLine = charAcc;
        }
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}
