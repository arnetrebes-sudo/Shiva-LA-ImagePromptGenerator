const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const API_KEY = process.env.GENAI_API_KEY || process.env.API_KEY;
if (!API_KEY) {
  console.warn('Warning: GENAI_API_KEY is not set. Server endpoints will fail without a valid key.');
}

const makeAI = () => new GoogleGenAI({ apiKey: API_KEY });

const handleError = (res, e) => {
  console.error(e);
  const message = (e && e.message) ? e.message : String(e);
  res.status(500).json({ data: null, error: { type: 'api', message: 'Server error', details: message } });
};

app.post('/api/generate-random-template', async (req, res) => {
  try {
    const ai = makeAI();
    const systemInstruction = `You are a creative Landscape Design Consultant.\nGenerate a single, highly imaginative and unique landscape architectural \"Template\".\nRespond with a JSON object matching the PromptTemplate interface.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Generate one random professional landscape template.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            icon: { type: Type.STRING },
            description: { type: Type.STRING },
            style: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ['id','label','icon','description','style','category']
        }
      }
    });

    if (!response || !response.text) {
      return res.json({ data: null, error: { type: 'parse', message: 'Empty response from model' } });
    }

    try {
      const data = JSON.parse(response.text);
      return res.json({ data, error: null });
    } catch (e) {
      return res.json({ data: null, error: { type: 'parse', message: 'Failed to parse model JSON', details: response.text } });
    }
  } catch (e) {
    return handleError(res, e);
  }
});

app.post('/api/generate-prompts', async (req, res) => {
  try {
    const { concept, style, category, count, referenceImage } = req.body || {};
    const ai = makeAI();

    const systemInstruction = `You are an expert Landscape Architect and AI Prompt Engineer.\nTranslate Core Concept into detailed image prompts optimized for image model.`;

    const parts = [{ text: `Core Concept: ${concept || ''}` }];
    if (referenceImage && referenceImage.data && referenceImage.mimeType) {
      parts.push({ inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              perspective: { type: Type.STRING },
              content: { type: Type.STRING },
              technicalDetails: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id','title','perspective','content','technicalDetails']
          }
        }
      }
    });

    if (!response || !response.text) {
      return res.json({ data: [], error: { type: 'parse', message: 'Empty response from model' } });
    }

    try {
      const data = JSON.parse(response.text);
      return res.json({ data, error: null });
    } catch (e) {
      return res.json({ data: [], error: { type: 'parse', message: 'Failed to parse model JSON', details: response.text } });
    }
  } catch (e) {
    return handleError(res, e);
  }
});

app.post('/api/visualize', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body || {};
    const ai = makeAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt || '' }] },
      config: { imageConfig: { aspectRatio: aspectRatio || '16:9' } }
    });

    if (!response) return res.json({ url: null, error: { type: 'unknown', message: 'Empty response from image model' } });
    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
      return res.json({ url: null, error: { type: 'safety', message: 'Visualization blocked by safety filters.' } });
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return res.json({ url: `data:image/png;base64,${part.inlineData.data}`, error: null });
      }
    }

    return res.json({ url: null, error: { type: 'unknown', message: 'No image generated' } });
  } catch (e) {
    return handleError(res, e);
  }
});

app.post('/api/edit-image', async (req, res) => {
  try {
    const { base64Image, instruction } = req.body || {};
    const ai = makeAI();
    const data = (base64Image || '').split(',')[1];
    const mimeType = (base64Image || '').split(',')[0]?.split(':')[1]?.split(';')[0] || 'image/png';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [ { inlineData: { data, mimeType } }, { text: instruction || '' } ] }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({ url: `data:image/png;base64,${part.inlineData.data}`, error: null });
      }
    }

    return res.json({ url: null, error: { type: 'unknown', message: 'Edit did not return an image' } });
  } catch (e) {
    return handleError(res, e);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`GenAI proxy server listening on port ${PORT}`);
});
