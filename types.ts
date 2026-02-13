
export interface GeneratedPrompt {
  id: string;
  title: string;
  perspective: string;
  content: string;
  technicalDetails: string[];
}

export interface PromptTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  style: LandscapeStyle;
  category: VisualisationCategory;
}

export enum LandscapeStyle {
  MODERNIST = 'Modernist',
  XERISCAPE = 'Xeriscape/Dry',
  ZEN = 'Zen Garden',
  WILD = 'Wild/Rewilded',
  TROPICAL = 'Tropical',
  MEDITERRANEAN = 'Mediterranean',
  MINIMALIST = 'Minimalist',
  INDUSTRIAL = 'Industrial/Urban',
  ENGLISH_GARDEN = 'English Landscape'
}

export enum VisualisationCategory {
  PHOTOREALISTIC = 'Photorealistic',
  DIAGRAM = 'Diagram Graphic',
  COMIC = 'Comic Style',
  CALENDAR = 'Flowering Calendar',
  DETAIL = 'Technical Detail',
  SECTION = 'Schnitt (Section)',
  ISOMETRIC = 'Isometric Graphic',
  EXPLODED = 'Exploded Drawing',
  MASTERPLAN = 'Masterplan Render',
  MOODBOARD = 'Texture Moodboard',
  AXONOMETRIC = 'Axonometric Cutaway',
  DETAIL_MACRO = 'Detail/Macro Shot'
}