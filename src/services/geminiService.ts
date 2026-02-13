// Client-side wrapper that calls the server proxy endpoints.
// Replaces direct use of @google/genai in the browser.

export interface ServiceError {
  message: string;
  type: 'safety' | 'api' | 'network' | 'parse' | 'unknown';
  details?: string;
}

async function safeJson(res: Response) {
  try {
    // try to parse a normal JSON { data, error } response
    return await res.json();
  } catch (e) {
    return { data: null, error: { type: 'parse', message: 'Invalid JSON from server', details: String(e) } };
  }
}

/**
 * Generate one random PromptTemplate via server proxy.
 * Server returns: { data: PromptTemplate | null, error: ServiceError | null }
 */
export const generateRandomTemplate = async (): Promise<{ data: any | null, error: ServiceError | null }> => {
  const res = await fetch('/api/generate-random-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  return await safeJson(res);
};

/**
 * Generate landscape architecture prompts via server proxy.
 * Server returns: { data: GeneratedPrompt[], error: ServiceError | null }
 */
export const generateLArchPrompts = async (
  concept: string,
  style: string,
  category: string,
  count: number = 3,
  referenceImage?: { data: string; mimeType: string }
): Promise<{ data: any[], error: ServiceError | null }> => {
  const res = await fetch('/api/generate-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept, style, category, count, referenceImage })
  });
  return await safeJson(res);
};

/**
 * Request an image visualization from the server proxy.
 * Server returns: { url: string | null, error: ServiceError | null }
 */
export const visualizePrompt = async (prompt: string, aspectRatio: string = '16:9'): Promise<{ url: string | null, error: ServiceError | null }> => {
  const res = await fetch('/api/visualize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio })
  });
  return await safeJson(res);
};

/**
 * Request an image edit from the server proxy.
 * Server returns: { url: string | null, error: ServiceError | null }
 */
export const editImage = async (base64Image: string, instruction: string): Promise<{ url: string | null, error: ServiceError | null }> => {
  const res = await fetch('/api/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, instruction })
  });
  return await safeJson(res);
};
