
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedPrompt, LandscapeStyle, VisualisationCategory, PromptTemplate } from "../types";

export interface ServiceError {
  message: string;
  type: 'safety' | 'api' | 'network' | 'parse' | 'unknown';
  details?: string;
}

const handleApiError = (error: any): ServiceError => {
  const message = error?.message || '';
  if (message.includes('Requested entity was not found')) {
    return {
      type: 'api',
      message: 'API Key or Model not found. If using a custom key, please re-authenticate.',
      details: message
    };
  }
  if (message.includes('safety') || message.includes('blocked')) {
    return {
      type: 'safety',
      message: 'The request was blocked by safety filters. Try adjusting your description.',
      details: message
    };
  }
  if (message.includes('fetch') || message.includes('network')) {
    return {
      type: 'network',
      message: 'Network error. Please check your internet connection.',
      details: message
    };
  }
  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    details: message
  };
};

export const generateRandomTemplate = async (): Promise<{ data: PromptTemplate | null, error: ServiceError | null }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `You are a creative Landscape Design Consultant. 
    Generate a single, highly imaginative and unique landscape architectural "Template".
    It should be niche, professional, and evocative. 
    Example: "Bioluminescent Wetland", "Kinetic Sound Garden", "Micro-Climate Atrium".
    Respond with a JSON object matching the PromptTemplate interface.
    Choose an appropriate LandscapeStyle and VisualisationCategory from the provided sets.
    The icon should be one of: Building2, Flower2, Mountain, Droplets, Box, Trees, Activity, Waves, Leaf, Layers, Layout, SunMedium.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate one random professional landscape template.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            icon: { type: Type.STRING },
            description: { type: Type.STRING },
            style: { type: Type.STRING, description: "Must be a valid LandscapeStyle enum value" },
            category: { type: Type.STRING, description: "Must be a valid VisualisationCategory enum value" }
          },
          required: ["id", "label", "icon", "description", "style", "category"]
        }
      }
    });

    if (!response.text) return { data: null, error: { type: 'parse', message: 'Empty response' } };
    return { data: JSON.parse(response.text), error: null };
  } catch (error: any) {
    return { data: null, error: handleApiError(error) };
  }
};

export const generateLArchPrompts = async (
  concept: string, 
  style: LandscapeStyle, 
  category: VisualisationCategory,
  count: number = 3,
  referenceImage?: { data: string; mimeType: string }
): Promise<{ data: GeneratedPrompt[], error: ServiceError | null }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `You are an expert Landscape Architect and AI Prompt Engineer. 
    Your goal is to translate a "Core Concept" into highly detailed, technical, and atmospheric image prompts optimized for "Gemini nano banana" (gemini-2.5-flash-image).
    
    Visualisation Category: ${category}. 
    Style Constraint: ${style}
    Generate exactly ${count} unique prompts.
    
    Each prompt MUST be technical: mentioning specific plant species, hardscape materials (e.g., "basalt pavers", "weathered cedar"), and lighting conditions.`;

    const promptParts: any[] = [{ text: `Core Concept: ${concept}` }];
    
    if (referenceImage) {
      promptParts.push({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: promptParts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              perspective: { type: Type.STRING },
              content: { type: Type.STRING },
              technicalDetails: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              }
            },
            required: ["id", "title", "perspective", "content", "technicalDetails"]
          }
        }
      }
    });

    if (!response.text) {
      return { data: [], error: { type: 'parse', message: 'The model returned an empty response.' } };
    }

    try {
      const data = JSON.parse(response.text);
      return { data, error: null };
    } catch (e) {
      return { data: [], error: { type: 'parse', message: 'Failed to parse the generated architectural data.', details: response.text } };
    }
  } catch (error: any) {
    return { data: [], error: handleApiError(error) };
  }
};

export const visualizePrompt = async (prompt: string, aspectRatio: string = "16:9"): Promise<{ url: string | null, error: ServiceError | null }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        }
      }
    });

    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
      return { url: null, error: { type: 'safety', message: 'Visualization blocked by safety filters.' } };
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { url: `data:image/png;base64,${part.inlineData.data}`, error: null };
      }
    }
    
    return { url: null, error: { type: 'unknown', message: 'No image was generated in the response.' } };
  } catch (error: any) {
    return { url: null, error: handleApiError(error) };
  }
};
