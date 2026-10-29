import 'server-only';

/** Describe visual treatment without carrying the original subject into a replacement. */
export async function describeImageStyle(imageUrl: string, apiKey: string): Promise<string> {
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(imageUrl) && !/^https:\/\//i.test(imageUrl)) {
    throw new Error('The original image must be a saved image or an HTTPS URL to match its style.');
  }
  const response = await trackedOpenAiFetch('Image style analysis', 'text', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Describe only the transferable visual style of an image for an image generator. Include medium, rendering technique, palette, linework, shading, texture, and lighting when visible. Do not mention any depicted objects, people, setting, action, pose, layout, or composition. Do not suggest keeping any content from the source. Respond with one concise style description.' },
        { role: 'user', content: [
          { type: 'text', text: 'Describe the visual style of this image.' },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ] },
      ],
      max_tokens: 180,
    }),
  });
  const result = await response.json() as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || 'Could not analyze the original image style.');
  const style = result.choices?.[0]?.message?.content?.trim();
  if (!style) throw new Error('Could not determine the original image style.');
  return style;
}
import { trackedOpenAiFetch } from '@/lib/server/ai-usage';
