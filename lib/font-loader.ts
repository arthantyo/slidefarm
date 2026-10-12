const fontStylesheets = new Map<string, Promise<void>>();

function loadFontStylesheet(fontFamily: string): Promise<void> {
  const existing = fontStylesheets.get(fontFamily);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    const params = new URLSearchParams({
      family: `${fontFamily}:ital,wght@0,400;0,700;1,400;1,700`,
      display: "swap",
    });
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${params.toString()}`;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });

  fontStylesheets.set(fontFamily, promise);
  return promise;
}

export async function loadFont(
  fontFamily: string,
  fontWeight: "normal" | "bold" = "normal",
  fontStyle: "normal" | "italic" = "normal",
): Promise<void> {
  if (typeof document === "undefined" || !fontFamily) return;

  await loadFontStylesheet(fontFamily);
  await document.fonts.load(`${fontStyle} ${fontWeight} 16px "${fontFamily}"`);
}
