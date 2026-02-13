
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedPrompt, LandscapeStyle, VisualisationCategory } from "../types";

export const generateLArchPrompts = async (
  concept: string, 
  style: LandscapeStyle, 
  category: VisualisationCategory,
  count: number = 3,
  referenceImage?: { data: string; mimeType: string }
): Promise<GeneratedPrompt[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are an expert Landscape Architect and AI Prompt Engineer. 
  Your goal is to translate a "Core Concept" (and an optional reference site plan/image) into highly detailed, technical, and atmospheric image prompts optimized for "Gemini nano banana" (gemini-2.5-flash-image).
  
  Visualisation Category: ${category}. 
  Ensure all prompts strictly adhere to the visual style of this category. 
  - If "Diagram Graphic", focus on clean lines, overlays, and conceptual clarity.
  - If "Photorealistic", focus on textures, lighting, and real-world physics.
  - If "Flowering Calendar", focus on seasonal planting shifts and color charts.
  - If "Isometric", ensure a 45-degree orthographic projection.
  - If "Exploded Drawing", describe layers separated vertically.
  - If "Schnitt (Section)", describe a vertical cut-through showing soil layers, roots, and heights.
  - If "Masterplan Render", describe a top-down artistic plan with shadows and scale indicators.
  - If "Axonometric Cutaway", show a 3D corner of the site with construction build-ups visible.
  - If "Detail/Macro Shot", focus on extreme close-ups of textures (e.g., weathered wood grain, water droplets on leaves, stone joints), shallow depth of field (bokeh), and intimate botanical characteristics.

  If a reference image is provided, analyze its spatial layout and topography.

  Each prompt should also include:
  1. Primary viewpoint/perspective matching the category.
  2. Specific planting palette.
  3. Hardscape materials.
  4. Atmospheric lighting.
  5. Technical architectural terms.
  
  Style Constraint: ${style}
  Generate exactly ${count} unique prompts.`;

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
            title: { type: Type.STRING, description: "Short descriptive title" },
            perspective: { type: Type.STRING },
            content: { type: Type.STRING, description: "The actual long-form AI image prompt" },
            technicalDetails: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Key architectural features included"
            }
          },
          required: ["id", "title", "perspective", "content", "technicalDetails"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const visualizePrompt = async (prompt: string, aspectRatio: string = "16:9"): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Visualization error:", error);
  }
  return null;
};

export const editImage = async (base64Image: string, instruction: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: instruction,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image editing error:", error);
  }
  return null;
};
