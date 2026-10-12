export const SAVED_IMAGE_PROMPTS_KEY = 'slidefarm:saved-image-prompts';
export const SAVED_IMAGE_PROMPTS_EVENT = 'slidefarm:saved-image-prompts-changed';

export function readSavedImagePrompts(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SAVED_IMAGE_PROMPTS_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
