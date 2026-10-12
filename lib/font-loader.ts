const fontStylesheets = new Map<string, Promise<void>>();

function loadFontStylesheet(fontFamily: string, fontWeight: number, fontStyle: "normal" | "italic"): Promise<void> {
  const key = `${fontFamily}:${fontStyle}:${fontWeight}`;
  const existing = fontStylesheets.get(key);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    const params = new URLSearchParams({
      family: `${fontFamily}:ital,wght@${fontStyle === "italic" ? 1 : 0},${fontWeight}`,
      display: "swap",
    });
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${params.toString()}`;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });

  fontStylesheets.set(key, promise);
  return promise;
}

export async function loadFont(
  fontFamily: string,
  fontWeight = 400,
  fontStyle: "normal" | "italic" = "normal",
): Promise<void> {
  if (typeof document === "undefined" || !fontFamily) return;

  await loadFontStylesheet(fontFamily, fontWeight, fontStyle);
  await document.fonts.load(`${fontStyle} ${fontWeight} 16px "${fontFamily}"`);
}
