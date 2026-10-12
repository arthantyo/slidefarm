import type { TemplateData } from '@/lib/canvas/template-filler';

export function parseSourceJson(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Source JSON must be an object.');
  }
  return parsed as Record<string, unknown>;
}

export function sourceToTemplateData(source: Record<string, unknown>): TemplateData {
  const data: TemplateData = {};
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      if (!value.every((part) => ['string', 'number', 'boolean'].includes(typeof part))) {
        throw new Error(`Every value for "${key}" must be text or a number.`);
      }
      data[key] = value.map(String);
    } else if (['string', 'number', 'boolean'].includes(typeof value)) {
      data[key] = String(value);
    } else {
      throw new Error(`The value for "${key}" must be text, a number, or an array of those values.`);
    }
  }
  return data;
}
