
export interface GeneratedPrompt {
  id: string;
  title: string;
  perspective: string;
  content: string;
  technicalDetails: string[];
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
  AXONOMETRIC = 'Axonometric Cutaway'
}

export enum PerspectiveType {
  EYE_LEVEL = 'Eye-level Perspective',
  AERIAL = 'Aerial/Birdseye View',
  PLAN = 'Site Plan/Layout',
  SECTION = 'Cross-section Detail',
  MACRO = 'Planting/Macro Detail'
}
