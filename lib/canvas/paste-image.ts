import { createImageElement } from '@/lib/canvas/element-factory';
import { useEditorStore } from '@/stores/editor-store';

export async function pasteImageFile(file: File, at?: { x: number; y: number }): Promise<void> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image.'));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error('Could not open image.'));
    image.src = src;
  });
  const state = useEditorStore.getState();
  if (!state.project || !state.currentSlideId) return;
  const { width, height } = state.project.dimensions;
  const scale = Math.min(1, width * 0.5 / size.width, height * 0.5 / size.height);
  const imageWidth = size.width * scale;
  const imageHeight = size.height * scale;
  state.addElement(createImageElement({
    src,
    x: (at?.x ?? width / 2) - imageWidth / 2,
    y: (at?.y ?? height / 2) - imageHeight / 2,
    width: imageWidth,
    height: imageHeight,
  }));
}
