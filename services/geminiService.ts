
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedPrompt, LandscapeStyle, VisualisationCategory } from "../types";

const API_KEY = process.env.API_KEY || "";

export const generateLArchPrompts = async (
  concept: string, 
  style: LandscapeStyle, 
  category: VisualisationCategory,
  count: number = 3
): Promise<GeneratedPrompt[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `You are an expert Landscape Architect and AI Prompt Engineer. 
  Your goal is to translate a "Core Concept" into highly detailed, technical, and atmospheric image prompts optimized for "Gemini nano banana" (gemini-2.5-flash-image).
  
  Visualisation Category: ${category}. 
  Ensure all prompts strictly adhere to the visual style of this category. 
  - If "Diagram Graphic", focus on clean lines, overlays, and conceptual clarity.
  - If "Photorealistic", focus on textures, lighting, and real-world physics.
  - If "Flowering Calendar", focus on seasonal planting shifts and color charts.
  - If "Isometric", ensure a 45-degree orthographic projection.
  - If "Exploded Drawing", describe layers separated vertically to show construction: Top layer (Plants), Middle layer (Hardscape/Substrate), Bottom layer (Geology/Drainage).
  - If "Schnitt (Section)", describe a vertical cut-through showing soil layers, roots, and heights.
  - If "Masterplan Render", describe a top-down artistic plan with shadows, texture-mapping for grass/water, and clear scale indicators.
  - If "Axonometric Cutaway", show a 3D corner of the site with internal construction build-ups visible.

  Each prompt should also include:
  1. Primary viewpoint/perspective matching the category.
  2. Specific planting palette (botanical names where appropriate).
  3. Hardscape materials (e.g., weathered steel, limestone, reclaimed timber).
  4. Atmospheric lighting (e.g., golden hour, misty morning, dappled shade).
  5. Technical architectural terms (e.g., level changes, drainage swales, gabion walls).
  
  Style Constraint: ${style}
  Generate exactly ${count} unique prompts.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Core Concept: ${concept}`,
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
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
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
  const ai = new GoogleGenAI({ apiKey: API_KEY });
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
