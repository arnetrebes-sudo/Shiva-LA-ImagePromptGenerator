
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Leaf, Sparkles, Copy, Eye, ChevronRight, Loader2, Download, AlertCircle, Layout, Trees,
  Compass, Check, Palette, Bookmark, BookmarkCheck, History, Library, Sun, Moon, Info, X,
  ExternalLink, Zap, Box, SunMedium, Layers, Wind, Droplets, FileDown, Play, Wand2,
  RefreshCw, Edit3, Save, Plus, Upload, Image as ImageIcon, Trash2, Share2, Globe, Quote,
  UploadCloud, PlusCircle, AlertTriangle, ScrollText, Droplet, Mountain, Building2, Flower2,
  Wind as WindIcon, Activity, Waves, ChevronDown, ChevronUp, Dice5
} from 'lucide-react';
import { GeneratedPrompt, LandscapeStyle, VisualisationCategory, PromptTemplate } from './types';
import { generateLArchPrompts, visualizePrompt, editImage, ServiceError, generateRandomTemplate } from './services/geminiService';

const STORAGE_KEY = 'larch_saved_prompts';
const GALLERY_STORAGE_KEY = 'larch_community_gallery_v3';
const THEME_KEY = 'larch_theme_preference';

const VISUALIZING_STEPS = [
  "Synthesizing botanical data...", "Calculating site lighting...", "Rasterizing architectural layers...",
  "Simulating seasonal shifts...", "Finalizing render context..."
];

const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    id: 'public-plaza',
    label: 'Public Plaza',
    icon: 'Building2',
    description: 'A vibrant urban node featuring modular basalt seating, interactive mist fountains, and high-performance shade canopies.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'wild-meadow',
    label: 'Ecological Meadow',
    icon: 'Flower2',
    description: 'A biodiversity-focused rewilding project with native perennial drifts, weathered timber walkways, and gravel bioswales.',
    style: LandscapeStyle.WILD,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'zen-atrium',
    label: 'Zen Sanctuary',
    icon: 'Mountain',
    description: 'A minimalist courtyard for reflection. Raked granite sand, monolithic boulders, and a single sculptural Acer palmatum.',
    style: LandscapeStyle.ZEN,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'waterfront',
    label: 'Sponge Waterfront',
    icon: 'Droplets',
    description: 'Climate-resilient riverfront with stepped stone gabions, riparian planting zones, and floating wetland modules.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.AXONOMETRIC
  },
  {
    id: 'industrial-park',
    label: 'Industrial Reuse',
    icon: 'Box',
    description: 'Post-industrial landscape in an old rail yard. Corten steel structures, reclaimed brick paving, and pioneer birch groves.',
    style: LandscapeStyle.INDUSTRIAL,
    category: VisualisationCategory.MASTERPLAN
  },
  {
    id: 'rooftop-forest',
    label: 'Rooftop Forest',
    icon: 'Trees',
    description: 'High-density intensive green roof. Multi-stem Betula pendula in large GRP planters, deck seating, and integrated glass balustrades.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'inclusive-play',
    label: 'Inclusive Play',
    icon: 'Activity',
    description: 'Multi-generational active landscape. Rubberized topography, bespoke timber climbing structures, and sensory planting of Stachys and Lavandula.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'luxury-retreat',
    label: 'Luxury Retreat',
    icon: 'Waves',
    description: 'High-end residential terrace. Infinity pool with dark slate lining, travertine paving, and clipped Buxus hedges under aged Olive trees.',
    style: LandscapeStyle.MEDITERRANEAN,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'healing-garden',
    label: 'Healing Garden',
    icon: 'Leaf',
    description: 'Therapeutic hospital courtyard. Circular accessible paths, raised planters with aromatic herbs, and soft-textured ornamental grasses.',
    style: LandscapeStyle.MINIMALIST,
    category: VisualisationCategory.PHOTOREALISTIC
  },
  {
    id: 'vertical-wall',
    label: 'Living Facade',
    icon: 'Layers',
    description: 'Hydropontic vertical garden on a commercial facade. Patterned planting of ferns and Heuchera, integrated with structural steel and glass.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.DETAIL
  },
  {
    id: 'campus-commons',
    label: 'Campus Quad',
    icon: 'Layout',
    description: 'Institutional open space. Formal lawn flanked by Acer avenues, social seating "hubs" of pre-cast concrete, and high-quality granite setts.',
    style: LandscapeStyle.MODERNIST,
    category: VisualisationCategory.MASTERPLAN
  },
  {
    id: 'arid-xeriscape',
    label: 'Arid Xeriscape',
    icon: 'SunMedium',
    description: 'Water-wise desert landscape. Agave and Yucca specimens emerging from crushed limestone, accented by weathered steel edging and mood lighting.',
    style: LandscapeStyle.XERISCAPE,
    category: VisualisationCategory.PHOTOREALISTIC
  }
];

interface GalleryItem {
  url: string;
  title: string;
  type: string;
  prompt: string;
}

const App: React.FC = () => {
  const [concept, setConcept] = useState('');
  const [style, setStyle] = useState<LandscapeStyle>(LandscapeStyle.MODERNIST);
  const [category, setCategory] = useState<VisualisationCategory>(VisualisationCategory.PHOTOREALISTIC);
  const [count, setCount] = useState(3);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryManualRef = useRef<HTMLInputElement>(null);

  const [visualizingIds, setVisualizingIds] = useState<Set<string>>(new Set());
  const [visualizedImages, setVisualizedImages] = useState<Record<string, string>>({});
  const [visualizationErrors, setVisualizationErrors] = useState<Record<string, ServiceError>>({});
  const [isBulkVisualizing, setIsBulkVisualizing] = useState(false);
  
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [randomInspiration, setRandomInspiration] = useState<PromptTemplate | null>(null);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [tempPromptContent, setTempPromptContent] = useState<string>('');

  const [globalError, setGlobalError] = useState<ServiceError | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<GalleryItem[]>([]);

  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>(() => {
    const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleryImages));
  }, [galleryImages]);

  useEffect(() => {
    let interval: number;
    if (visualizingIds.size > 0 || isEditingId) {
      interval = window.setInterval(() => {
        setLoadingStepIndex(prev => (prev + 1) % VISUALIZING_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [visualizingIds.size, isEditingId]);

  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  const [savedPrompts, setSavedPrompts] = useState<GeneratedPrompt[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const applyTemplate = (tpl: PromptTemplate) => {
    setConcept(tpl.description);
    setStyle(tpl.style);
    setCategory(tpl.category);
    setActiveTemplateId(tpl.id);
    setFeedbackMessage(`Inspiration "${tpl.label}" applied`);
    setTimeout(() => setFeedbackMessage(null), 2000);
  };

  const handleRandomInspiration = async () => {
    setIsGeneratingRandom(true);
    const { data, error } = await generateRandomTemplate();
    if (error) {
      setGlobalError(error);
    } else if (data) {
      setRandomInspiration(data);
      setShowTemplates(true);
    }
    setIsGeneratingRandom(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setReferenceImage({ data: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const handleManualGalleryFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newPending: GalleryItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const filePromise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const url = await filePromise;
      newPending.push({
        url,
        title: `Archive Entry ${galleryImages.length + pendingUploads.length + i + 1}`,
        type: category,
        prompt: `Site study: ${file.name}`
      });
    }

    setPendingUploads(prev => [...prev, ...newPending]);
    setIsUploadModalOpen(true);
    e.target.value = ''; 
  };

  const submitManualGalleryUpload = () => {
    if (pendingUploads.length === 0) return;
    setGalleryImages(prev => [...pendingUploads, ...prev].slice(0, 60));
    setPendingUploads([]);
    setIsUploadModalOpen(false);
    setFeedbackMessage(`Successfully added ${pendingUploads.length} renders to the Archive`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleClearArchive = () => {
    if (window.confirm("Are you sure you want to delete all images from the Showcase Archive? This action cannot be undone.")) {
      setGalleryImages([]);
      localStorage.removeItem(GALLERY_STORAGE_KEY);
      setFeedbackMessage("Archive cleared successfully");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const removeReferenceImage = () => setReferenceImage(null);

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    setActiveTab('recent');
    
    const { data, error } = await generateLArchPrompts(concept, style, category, count, referenceImage || undefined);
    
    if (error) {
      setGlobalError(error);
    } else {
      setPrompts(data);
    }
    setIsGenerating(false);
  };

  const processSingleVisualization = useCallback(async (id: string, content: string) => {
    setVisualizingIds(prev => new Set(prev).add(id));
    setVisualizationErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const { url, error } = await visualizePrompt(content);
    
    if (error) {
      setVisualizationErrors(prev => ({ ...prev, [id]: error }));
    } else if (url) {
      setVisualizedImages(prev => ({ ...prev, [id]: url }));
    }

    setVisualizingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleVisualize = (id: string, content: string) => {
    processSingleVisualization(id, content);
  };

  const handleRenderAll = async () => {
    const targetPrompts = activeTab === 'recent' ? prompts : savedPrompts;
    if (targetPrompts.length === 0 || isBulkVisualizing) return;
    setIsBulkVisualizing(true);
    for (const prompt of targetPrompts) {
      if (visualizedImages[prompt.id] || visualizingIds.has(prompt.id)) continue;
      await processSingleVisualization(prompt.id, prompt.content);
    }
    setIsBulkVisualizing(false);
  };

  const handleShareToGallery = (prompt: GeneratedPrompt) => {
    const imageUrl = visualizedImages[prompt.id];
    if (!imageUrl) return;
    setGalleryImages(prev => [
      { url: imageUrl, type: prompt.perspective || 'Architectural View', title: prompt.title || 'User Contribution', prompt: prompt.content },
      ...prev
    ].slice(0, 60));
    setCopiedId(`shared-${prompt.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditingPrompt = (prompt: GeneratedPrompt) => {
    setEditingPromptId(prompt.id);
    setTempPromptContent(prompt.content);
  };

  const savePromptContent = (id: string) => {
    const updateList = (list: GeneratedPrompt[]) => list.map(p => p.id === id ? { ...p, content: tempPromptContent } : p);
    setPrompts(updateList(prompts));
    setSavedPrompts(updateList(savedPrompts));
    setEditingPromptId(null);
  };

  const toggleSavePrompt = (prompt: GeneratedPrompt) => {
    setSavedPrompts(prev => prev.some(p => p.id === prompt.id) ? prev.filter(p => p.id !== prompt.id) : [prompt, ...prev]);
  };

  const isPromptSaved = (id: string) => savedPrompts.some(p => p.id === id);
  const displayedPrompts = activeTab === 'recent' ? prompts : savedPrompts;

  const updatePendingUpload = (index: number, field: keyof GalleryItem, value: string) => {
    setPendingUploads(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePendingUpload = (index: number) => {
    setPendingUploads(prev => prev.filter((_, i) => i !== index));
  };

  const getTemplateIcon = (iconName: string) => {
    switch(iconName) {
      case 'Building2': return <Building2 className="w-3.5 h-3.5" />;
      case 'Flower2': return <Flower2 className="w-3.5 h-3.5" />;
      case 'Mountain': return <Mountain className="w-3.5 h-3.5" />;
      case 'Droplets': return <Droplets className="w-3.5 h-3.5" />;
      case 'Box': return <Box className="w-3.5 h-3.5" />;
      case 'Trees': return <Trees className="w-3.5 h-3.5" />;
      case 'Activity': return <Activity className="w-3.5 h-3.5" />;
      case 'Waves': return <Waves className="w-3.5 h-3.5" />;
      case 'Leaf': return <Leaf className="w-3.5 h-3.5" />;
      case 'Layers': return <Layers className="w-3.5 h-3.5" />;
      case 'Layout': return <Layout className="w-3.5 h-3.5" />;
      case 'SunMedium': return <SunMedium className="w-3.5 h-3.5" />;
      default: return <ScrollText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-700 dark:text-slate-200 bg-[#fdfcfb] dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-orange-100 dark:border-slate-800 py-6 px-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl border border-orange-100 dark:border-slate-700 overflow-hidden shadow-sm bg-orange-50 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-orange-400 font-bold">LA</div>
            <div>
              <h1 className="text-xl font-serif font-bold text-orange-900 dark:text-orange-100">LA Visual Prompt Engine</h1>
              <p className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Nano-Banana Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveTab('saved')} className={`hidden md:flex items-center gap-2 text-sm font-semibold transition-colors ${activeTab === 'saved' ? 'text-orange-500' : 'text-slate-500'}`}><Library className="w-4 h-4" /> My Library ({savedPrompts.length})</button>
             <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-xl bg-orange-50 dark:bg-slate-800 text-orange-500 border border-orange-100 dark:border-slate-700 transition-all">{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          </div>
        </div>
      </header>

      <section className="bg-orange-500 dark:bg-orange-600 py-4 px-4 shadow-md z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-white text-center">
          <Zap className="w-5 h-5 fill-white flex-shrink-0 hidden sm:block" />
          <p className="text-sm font-bold tracking-tight leading-snug">
            This is a <span className="underline decoration-white/50 underline-offset-4 font-black">LA Shiva Tool</span> designed to help Landscapearchitects and Planners with fast sketching of new ideas
          </p>
        </div>
      </section>

      {feedbackMessage && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm">
            <Check className="w-4 h-4" />
            {feedbackMessage}
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold">Batch Upload: {pendingUploads.length} Items</h2>
                <p className="text-slate-500 text-xs mt-1">Refine metadata for your session contributions</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => galleryManualRef.current?.click()} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-100 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> Add More Files
                </button>
                <button onClick={() => { setIsUploadModalOpen(false); setPendingUploads([]); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingUploads.map((item, index) => (
                  <div key={index} className="flex flex-col p-4 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4">
                      <img src={item.url} className="w-full h-full object-cover" alt={`Preview ${index}`} />
                      <button onClick={() => removePendingUpload(index)} className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Project Title"
                        value={item.title} 
                        onChange={(e) => updatePendingUpload(index, 'title', e.target.value)} 
                        className="w-full p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold outline-none focus:ring-2 ring-orange-100 transition-all" 
                      />
                      <textarea 
                        placeholder="Technical description..."
                        value={item.prompt} 
                        onChange={(e) => updatePendingUpload(index, 'prompt', e.target.value)} 
                        className="w-full p-2.5 h-16 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] outline-none focus:ring-2 ring-orange-100 transition-all resize-none" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
               <button 
                onClick={submitManualGalleryUpload} 
                disabled={pendingUploads.length === 0}
                className="flex-[0.5] bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Publish All Items
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-5 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-orange-50 dark:border-slate-800 p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h2 className="font-bold text-lg">Inspiration Library</h2>
              </div>
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-2 rounded-full hover:bg-orange-50 dark:hover:bg-slate-800 text-slate-400 transition-all"
              >
                {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Template Spoiler */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showTemplates ? 'max-h-[500px] mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-wrap gap-2 p-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button 
                  onClick={handleRandomInspiration}
                  disabled={isGeneratingRandom}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border bg-slate-900 text-white border-slate-900 hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 active:scale-95"
                >
                  {isGeneratingRandom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Dice5 className="w-3.5 h-3.5" />}
                  AI Surprise
                </button>
                
                {randomInspiration && (
                  <button 
                    onClick={() => applyTemplate(randomInspiration)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border animate-in zoom-in-95 ${activeTemplateId === randomInspiration.id ? 'bg-purple-500 border-purple-500 text-white' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-600 hover:bg-purple-100'}`}
                  >
                    {getTemplateIcon(randomInspiration.icon)}
                    {randomInspiration.label} (NEW)
                  </button>
                )}

                {PRESET_TEMPLATES.map(tpl => (
                  <button 
                    key={tpl.id} 
                    onClick={() => applyTemplate(tpl)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${activeTemplateId === tpl.id ? 'bg-orange-400 border-orange-400 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-orange-200 hover:bg-orange-50'}`}
                  >
                    {getTemplateIcon(tpl.icon)}
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              className="w-full h-48 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-orange-100 focus:border-orange-200 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-6" 
              placeholder="Describe the atmosphere, materiality, and botanical highlights..." 
              value={concept} 
              onChange={(e) => {
                setConcept(e.target.value);
                setActiveTemplateId(null);
              }} 
            />
            
            <div className="mb-6">
              {!referenceImage ? (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-orange-200 hover:bg-orange-50/30 transition-all flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-400" /><span className="text-xs font-bold text-slate-500">Upload Site Plan / Reference</span>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-orange-100 dark:border-slate-800"><img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} className="w-full h-32 object-cover opacity-80" alt="Reference" /><button onClick={removeReferenceImage} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"><Trash2 className="w-4 h-4" /></button></div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-1">Typology</label>
                <select className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm outline-none" value={style} onChange={(e) => setStyle(e.target.value as LandscapeStyle)}>{Object.values(LandscapeStyle).map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-1">View Type</label>
                <select className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm outline-none" value={category} onChange={(e) => setCategory(e.target.value as VisualisationCategory)}>{Object.values(VisualisationCategory).map(v => <option key={v} value={v}>{v}</option>)}</select>
              </div>
            </div>

            {globalError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-start gap-3 animate-in fade-in zoom-in-95">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-tight mb-1">{globalError.type} ERROR</p>
                  <p className="text-[13px] text-red-600 dark:text-red-300 font-medium leading-relaxed">{globalError.message}</p>
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={isGenerating || !concept.trim()} className="w-full bg-orange-400 hover:bg-orange-500 disabled:bg-slate-200 text-white font-bold py-4.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.98]">{isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Prompts<ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}</button>
            <button onClick={handleRenderAll} disabled={isBulkVisualizing || prompts.length === 0} className="w-full mt-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-30">{isBulkVisualizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5" />Generate Visuals</>}</button>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('recent')} className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full ${activeTab === 'recent' ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-orange-400'}`}><History className="w-4 h-4" /> Recent</button>
              <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full ${activeTab === 'saved' ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-orange-400'}`}><Bookmark className="w-4 h-4" /> Saved</button>
            </div>
          </div>

          <div className="space-y-8">
            {displayedPrompts.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
                <Trees className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 italic text-sm">No prompts generated yet. Start by defining your core concept.</p>
              </div>
            )}
            {displayedPrompts.map((prompt) => (
              <div key={prompt.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 text-[9px] font-extrabold uppercase tracking-widest border border-orange-100/50">{prompt.perspective}</span>
                        <button onClick={() => toggleSavePrompt(prompt)} className={`p-1.5 rounded-lg transition-colors ${isPromptSaved(prompt.id) ? 'text-orange-500 bg-orange-50' : 'text-slate-300 hover:text-orange-400'}`}>{isPromptSaved(prompt.id) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}</button>
                        <button onClick={() => startEditingPrompt(prompt)} className="p-1.5 rounded-lg text-slate-300 hover:text-orange-400"><Edit3 className="w-5 h-5" /></button>
                      </div>
                      <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-slate-100">{prompt.title}</h3>
                    </div>
                  </div>
                  {editingPromptId === prompt.id ? (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <textarea className="w-full p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/20 text-[13px] text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-orange-100 outline-none h-32" value={tempPromptContent} onChange={(e) => setTempPromptContent(e.target.value)} autoFocus />
                      <div className="flex justify-end gap-2 mt-3"><button onClick={() => setEditingPromptId(null)} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button><button onClick={() => savePromptContent(prompt.id)} className="px-4 py-2 rounded-lg bg-orange-400 text-white text-xs font-bold flex items-center gap-2"><Save className="w-3.5 h-3.5" />Apply</button></div>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-[13px] mb-6 italic leading-relaxed bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-xl">"{prompt.content}"</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => handleVisualize(prompt.id, prompt.content)} disabled={visualizingIds.has(prompt.id)} className="flex-[2] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all group active:scale-[0.98] disabled:opacity-30">{visualizingIds.has(prompt.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}{visualizingIds.has(prompt.id) ? 'Rendering...' : 'Visualize Concept'}</button>
                    <button onClick={() => {navigator.clipboard.writeText(prompt.content); setCopiedId(prompt.id); setTimeout(() => setCopiedId(null), 2000);}} className={`flex-1 flex items-center justify-center gap-2.5 text-xs font-bold py-4 rounded-2xl transition-all border ${copiedId === prompt.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 dark:bg-slate-800 text-orange-600 border-orange-100 dark:border-slate-700 hover:bg-orange-100'}`}>{copiedId === prompt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copiedId === prompt.id ? 'Copied!' : 'Copy'}</button>
                  </div>
                </div>

                {(visualizingIds.has(prompt.id) || isEditingId === prompt.id) && (
                  <div className="px-6 pb-6"><div className="rounded-[1.5rem] border border-orange-100 dark:border-slate-800 bg-slate-50/50 p-12 flex flex-col items-center justify-center min-h-[300px]"><Loader2 className="w-10 h-10 animate-spin text-orange-400 mb-4" /><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">{VISUALIZING_STEPS[loadingStepIndex]}</p></div></div>
                )}

                {visualizationErrors[prompt.id] && !visualizingIds.has(prompt.id) && (
                   <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-2">
                     <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5 p-8 flex flex-col items-center text-center">
                        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1">Visualization Failed</h4>
                        <p className="text-xs text-red-600 dark:text-red-300 max-w-sm mb-6">{visualizationErrors[prompt.id].message}</p>
                        <button onClick={() => handleVisualize(prompt.id, prompt.content)} className="px-6 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Retry Render</button>
                     </div>
                   </div>
                )}

                {visualizedImages[prompt.id] && !visualizingIds.has(prompt.id) && !visualizationErrors[prompt.id] && isEditingId !== prompt.id && (
                  <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative group rounded-2xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-950">
                      <img src={visualizedImages[prompt.id]} className="w-full object-cover max-h-[500px]" alt="AI Preview" />
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleShareToGallery(prompt)} className={`p-3 rounded-xl shadow-xl transition-all ${copiedId === `shared-${prompt.id}` ? 'bg-orange-500 text-white' : 'bg-white/95 text-orange-500 hover:bg-white'}`}><Share2 className="w-5 h-5" /></button>
                        <a href={visualizedImages[prompt.id]} download="render.png" className="bg-white/95 p-3 rounded-xl shadow-xl text-orange-500 hover:bg-white"><Download className="w-5 h-5" /></a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-12 mt-12 pb-12 border-t border-orange-100 dark:border-slate-800 pt-16">
          <div className="flex flex-col items-center mb-10"><h2 className="text-3xl font-serif font-bold text-orange-900 dark:text-orange-100 mb-2">Showcase Archive</h2><div className="h-1 w-24 bg-orange-400 rounded-full"></div><p className="mt-4 text-slate-500 text-sm font-medium tracking-wide flex items-center gap-2"><Globe className="w-4 h-4" /> STUDIO SHOWCASE: RECENT ARCHITECTURAL VISUALIZATIONS</p></div>
          <div className="flex overflow-x-auto gap-8 px-4 py-4 no-scrollbar custom-scrollbar snap-x snap-mandatory scroll-smooth mb-12">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="flex-shrink-0 w-[320px] md:w-[450px] snap-center group">
                <div className="relative rounded-[2rem] overflow-hidden border border-orange-50 dark:border-slate-800 shadow-sm transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl">
                  <img src={img.url} className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-110" alt={img.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                    <span className="inline-block self-start px-3 py-1 bg-orange-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg mb-2">{img.type}</span>
                    <h4 className="text-white font-serif text-xl font-bold mb-2">{img.title}</h4>
                    <p className="text-white/70 text-[11px] line-clamp-3 italic"><Quote className="inline w-3 h-3 mr-1 opacity-50" />{img.prompt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {galleryImages.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic font-medium">Archive is currently empty.</div>
          )}
          <div className="flex flex-col items-center">
            <div className="bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-800 rounded-3xl p-8 max-w-2xl w-full flex flex-col items-center gap-6 shadow-sm">
              <div className="w-16 h-16 bg-orange-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-orange-500"><UploadCloud className="w-8 h-8" /></div>
              <div className="text-center">
                <h3 className="text-lg font-bold">Manage Studio Showcase</h3>
                <p className="text-sm text-slate-500 mt-2">Upload multiple renders in a single session to feature them.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <button onClick={() => galleryManualRef.current?.click()} className="flex-1 min-w-[200px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
                  <ImageIcon className="w-4 h-4" /> Select Batch Renders
                </button>
                {galleryImages.length > 0 && (
                  <button onClick={handleClearArchive} className="flex-1 min-w-[200px] border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-500 px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                    <Trash2 className="w-4 h-4" /> Delete All Images
                  </button>
                )}
              </div>
              <input type="file" ref={galleryManualRef} onChange={handleManualGalleryFileSelection} accept="image/*" multiple className="hidden" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-orange-50 py-12 px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-400 text-xs font-medium mb-1">&copy; 2024 LA Visual Prompt Engine Version 2.1</p>
            <p className="text-slate-300 text-[10px] uppercase tracking-widest font-bold">Optimized for Gemini Flash Image & Pro Preview</p>
            <p className="text-slate-300 text-[10px] uppercase tracking-widest font-bold">part of the LA Shiva Toolsuite</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            <span className="text-orange-400 font-bold text-[10px] uppercase tracking-widest">Studio Pipeline Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
