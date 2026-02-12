
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Leaf, 
  Sparkles, 
  Copy, 
  Eye, 
  ChevronRight, 
  Loader2, 
  Download,
  AlertCircle,
  Layout,
  Trees,
  Compass,
  Check,
  Palette,
  Bookmark,
  BookmarkCheck,
  History,
  Library,
  Sun,
  Moon,
  Info,
  X,
  ExternalLink,
  Zap,
  Box,
  SunMedium,
  Layers,
  Wind,
  Droplets,
  FileDown,
  Play,
  Wand2,
  RefreshCw,
  Edit3,
  Save,
  Plus
} from 'lucide-react';
import { GeneratedPrompt, LandscapeStyle, VisualisationCategory } from './types';
import { generateLArchPrompts, visualizePrompt, editImage } from './services/geminiService';

const STORAGE_KEY = 'larch_saved_prompts';
const THEME_KEY = 'larch_theme_preference';

const VISUALIZING_STEPS = [
  "Synthesizing botanical data...",
  "Calculating site lighting...",
  "Rasterizing architectural layers...",
  "Simulating seasonal shifts...",
  "Finalizing render context..."
];

const SUGGESTIONS = [
  { label: 'Acer palmatum', category: 'Planting' },
  { label: 'Betula pendula', category: 'Planting' },
  { label: 'Miscanthus sinensis', category: 'Planting' },
  { label: 'Lavandula', category: 'Planting' },
  { label: 'Salvia nemorosa', category: 'Planting' },
  { label: 'Corten Steel', category: 'Material' },
  { label: 'Limestone Pavers', category: 'Material' },
  { label: 'Poured Concrete', category: 'Material' },
  { label: 'Reclaimed Timber', category: 'Material' },
  { label: 'Basalt Setts', category: 'Material' },
  { label: 'Bioswale', category: 'Structural' },
  { label: 'Rain Garden', category: 'Structural' },
  { label: 'Sunken Terrace', category: 'Structural' },
  { label: 'Gabion Wall', category: 'Structural' },
  { label: 'Infinity Edge', category: 'Structural' },
  { label: 'Dappled Shade', category: 'Atmosphere' },
  { label: 'Golden Hour', category: 'Atmosphere' },
  { label: 'Misty Morning', category: 'Atmosphere' },
  { label: 'Twilight Glow', category: 'Atmosphere' }
];

const App: React.FC = () => {
  const [concept, setConcept] = useState('');
  const [style, setStyle] = useState<LandscapeStyle>(LandscapeStyle.MODERNIST);
  const [category, setCategory] = useState<VisualisationCategory>(VisualisationCategory.PHOTOREALISTIC);
  const [count, setCount] = useState(3);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Visualization States
  const [visualizingIds, setVisualizingIds] = useState<Set<string>>(new Set());
  const [visualizedImages, setVisualizedImages] = useState<Record<string, string>>({});
  const [isBulkVisualizing, setIsBulkVisualizing] = useState(false);
  
  // Image Editing States
  const [editInstructions, setEditInstructions] = useState<Record<string, string>>({});
  const [isEditingId, setIsEditingId] = useState<string | null>(null);

  // Prompt Content Editing States
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [tempPromptContent, setTempPromptContent] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // Cycle through loading steps when visualizing
  useEffect(() => {
    let interval: number;
    if (visualizingIds.size > 0 || isEditingId) {
      interval = window.setInterval(() => {
        setLoadingStepIndex(prev => (prev + 1) % VISUALIZING_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [visualizingIds.size, isEditingId]);

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme class to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  // Load saved prompts from localStorage
  const [savedPrompts, setSavedPrompts] = useState<GeneratedPrompt[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Sync saved prompts to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setIsGenerating(true);
    setError(null);
    setActiveTab('recent');
    try {
      const results = await generateLArchPrompts(concept, style, category, count);
      setPrompts(results);
    } catch (err) {
      setError('Failed to generate prompts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const processSingleVisualization = useCallback(async (id: string, content: string) => {
    setVisualizingIds(prev => new Set(prev).add(id));
    try {
      const imageUrl = await visualizePrompt(content);
      if (imageUrl) {
        setVisualizedImages(prev => ({ ...prev, [id]: imageUrl }));
      } else {
        setError(`Failed to visualize prompt: ${id}`);
      }
    } catch (err) {
      setError('Error during visualization.');
    } finally {
      setVisualizingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleVisualize = (promptId: string, promptContent: string) => {
    processSingleVisualization(promptId, promptContent);
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

  const handleEditVisualization = async (id: string) => {
    const instruction = editInstructions[id];
    const currentImage = visualizedImages[id];
    if (!instruction || !currentImage || isEditingId) return;

    setIsEditingId(id);
    try {
      const newImageUrl = await editImage(currentImage, instruction);
      if (newImageUrl) {
        setVisualizedImages(prev => ({ ...prev, [id]: newImageUrl }));
        setEditInstructions(prev => ({ ...prev, [id]: '' }));
      } else {
        setError('Failed to edit image.');
      }
    } catch (err) {
      setError('Error during image editing.');
    } finally {
      setIsEditingId(null);
    }
  };

  const startEditingPrompt = (prompt: GeneratedPrompt) => {
    setEditingPromptId(prompt.id);
    setTempPromptContent(prompt.content);
  };

  const savePromptContent = (id: string) => {
    const updateList = (list: GeneratedPrompt[]) => 
      list.map(p => p.id === id ? { ...p, content: tempPromptContent } : p);

    setPrompts(updateList(prompts));
    setSavedPrompts(updateList(savedPrompts));
    setEditingPromptId(null);
  };

  const cancelEditingPrompt = () => {
    setEditingPromptId(null);
    setTempPromptContent('');
  };

  const handleAddSuggestion = (suggestion: string) => {
    setTempPromptContent(prev => {
      const trimmed = prev.trim();
      return `${trimmed}${trimmed.endsWith('.') ? '' : ','} ${suggestion}`;
    });
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSavePrompt = (prompt: GeneratedPrompt) => {
    setSavedPrompts(prev => {
      const isSaved = prev.some(p => p.id === prompt.id);
      if (isSaved) {
        return prev.filter(p => p.id !== prompt.id);
      } else {
        return [prompt, ...prev];
      }
    });
  };

  const handleDownloadAll = () => {
    const targetPrompts = activeTab === 'recent' ? prompts : savedPrompts;
    if (targetPrompts.length === 0) return;

    let content = `LA Visual Prompt Engine - ${activeTab.toUpperCase()} SESSION\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += `Design Style: ${style}\n`;
    content += `Category: ${category}\n`;
    content += `--------------------------------------------------\n\n`;

    targetPrompts.forEach((p, index) => {
      content += `[${index + 1}] ${p.title}\n`;
      content += `Perspective: ${p.perspective}\n`;
      content += `Technical Details: ${p.technicalDetails.join(', ')}\n\n`;
      content += `PROMPT:\n${p.content}\n`;
      content += `--------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `la-visual-${activeTab}-session-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isPromptSaved = (id: string) => savedPrompts.some(p => p.id === id);

  const displayedPrompts = activeTab === 'recent' ? prompts : savedPrompts;

  return (
    <div className="min-h-screen flex flex-col text-slate-700 dark:text-slate-200 bg-[#fdfcfb] dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-orange-100 dark:border-slate-800 py-6 px-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl border border-orange-100 dark:border-slate-700 overflow-hidden shadow-sm bg-orange-50 dark:bg-slate-800 flex-shrink-0">
              <img 
                src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/succulent-red.jpg" 
                alt="LA Visual Logo" 
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-orange-400 font-bold">LA</div>';
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight text-orange-900 dark:text-orange-100 leading-tight">LA Visual Prompt Engine</h1>
              <p className="text-[10px] text-orange-400 dark:text-orange-300 uppercase tracking-[0.2em] font-bold">Nano-Banana Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-8">
            <div className="hidden md:flex gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <button 
                onClick={() => setIsLearnMoreOpen(true)}
                className="flex items-center gap-2 hover:text-orange-500 dark:hover:text-orange-300 transition-colors"
              >
                <Info className="w-4 h-4" />
                Learn More
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 transition-colors ${activeTab === 'saved' ? 'text-orange-500 dark:text-orange-400' : 'hover:text-orange-500 dark:hover:text-orange-300'}`}
              >
                <Library className="w-4 h-4" />
                My Library ({savedPrompts.length})
              </button>
            </div>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl bg-orange-50 dark:bg-slate-800 text-orange-500 dark:text-orange-400 border border-orange-100 dark:border-slate-700 hover:scale-110 transition-all shadow-sm"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Learn More Modal */}
      {isLearnMoreOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-orange-50 dark:border-slate-800">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-orange-100 mb-2">The Studio Pipeline</h2>
                  <p className="text-orange-500 dark:text-orange-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-current" /> Optimized for Gemini Nano-Banana
                  </p>
                </div>
                <button 
                  onClick={() => setIsLearnMoreOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <section>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Box className="w-5 h-5 text-orange-400" />
                    What is Nano-Banana?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    "Nano-Banana" is the codename for the high-efficiency <b>Gemini 2.5 Flash Image</b> model. This studio uses it for near-instant rendering of architectural visualizations, specialized in high-resolution textures and accurate plant light-scattering.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-orange-400" />
                    Prompt Engineering Logic
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-orange-100/50 dark:border-slate-800">
                      <p className="font-bold text-orange-900 dark:text-orange-100 text-xs uppercase mb-2">Botanical Accuracy</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Prompts are injected with Latin plant names and ecological palettes tailored to your design style.</p>
                    </div>
                    <div className="bg-orange-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-orange-100/50 dark:border-slate-800">
                      <p className="font-bold text-orange-900 dark:text-orange-100 text-xs uppercase mb-2">Lighting & Atmosphere</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Atmospheric conditions like "Golden Hour Mist" or "Dappled Shade" are calculated based on your visual category.</p>
                    </div>
                    <div className="bg-orange-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-orange-100/50 dark:border-slate-800">
                      <p className="font-bold text-orange-900 dark:text-orange-100 text-xs uppercase mb-2">Structural Schematic</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Detailed hardscape materials like 'weathered limestone' or 'poured anthracite concrete' ensure technical depth.</p>
                    </div>
                    <div className="bg-orange-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-orange-100/50 dark:border-slate-800">
                      <p className="font-bold text-orange-900 dark:text-orange-100 text-xs uppercase mb-2">Geometric Precision</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Views like 'Isometric' or 'Section Schnitt' utilize spatial keywords to guide the model's perspective engine.</p>
                    </div>
                  </div>
                </section>

                <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                   <a href="https://ai.google.dev" target="_blank" className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
                     Learn more at Google AI <ExternalLink className="w-3 h-3" />
                   </a>
                   <button 
                     onClick={() => setIsLearnMoreOpen(false)}
                     className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-xs font-bold hover:scale-105 transition-all active:scale-95"
                   >
                     Got it
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Input */}
        <section className="lg:col-span-5 space-y-8">
          {/* Informational Banner */}
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-6 rounded-[2rem] shadow-lg shadow-orange-100/50 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium leading-relaxed">
                  This is a customizable Image Prompt Generator, optimized for <strong>Google Gemini Nano Banana</strong>. A tool for <strong>Landscape Architects</strong> and <strong>Creatives</strong> alike, to sketch Ideas and Concepts.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-orange-50 dark:border-slate-800 p-8">
            <div className="flex items-center gap-2 mb-6 text-orange-900 dark:text-orange-100">
              <Sparkles className="w-5 h-5 text-orange-400 dark:text-orange-300" />
              <h2 className="font-bold text-lg">Core Concept</h2>
            </div>
            
            <textarea
              className="w-full h-56 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20 focus:border-orange-200 dark:focus:border-orange-800 resize-none text-slate-600 dark:text-slate-300 leading-relaxed outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Paste your landscape concept here... Describe the atmosphere, materiality, and botanical highlights."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />

            <div className="space-y-6 mt-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Design Style</label>
                  <select 
                    className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm outline-none cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors appearance-none"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as LandscapeStyle)}
                  >
                    {Object.values(LandscapeStyle).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Outputs</label>
                  <select 
                    className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm outline-none cursor-pointer appearance-none"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    <option value={1}>1 Prompt</option>
                    <option value={3}>3 Prompts</option>
                    <option value={5}>5 Prompts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Visualisation Category
                </label>
                <select 
                  className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm outline-none cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VisualisationCategory)}
                >
                  {Object.values(VisualisationCategory).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !concept.trim()}
              className="w-full mt-8 bg-orange-400 dark:bg-orange-500 hover:bg-orange-500 dark:hover:bg-orange-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold py-4.5 rounded-2xl shadow-lg shadow-orange-100/50 dark:shadow-none transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Generate Prompts
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* NEW: Generate Image Bulk Button */}
            <button
              onClick={handleRenderAll}
              disabled={isBulkVisualizing || prompts.length === 0}
              className="w-full mt-4 bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-30"
            >
              {isBulkVisualizing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Image
                </>
              )}
            </button>
            
            {error && (
              <div className="mt-5 p-4 bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <div className="bg-orange-50/40 dark:bg-slate-900/40 rounded-3xl p-6 border border-orange-100/50 dark:border-slate-800">
            <h3 className="text-orange-900 dark:text-orange-100 font-bold mb-3 flex items-center gap-2 text-sm">
              <Compass className="w-4 h-4 text-orange-400 dark:text-orange-300" />
              Studio Tips
            </h3>
            <p className="text-orange-800/70 dark:text-slate-400 text-sm leading-relaxed">
              Use the "Refine Visual" field on any rendered image to ask Gemini for specific edits like "Make it more misty" or "Add a stone fountain".
            </p>
          </div>
        </section>

        {/* Right Column: Output */}
        <section className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full ${activeTab === 'recent' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-slate-400 dark:text-slate-600 hover:text-orange-400'}`}
              >
                <History className="w-4 h-4" />
                Recent
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full ${activeTab === 'saved' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-slate-400 dark:text-slate-600 hover:text-orange-400'}`}
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              {displayedPrompts.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                  title="Download all as .txt"
                >
                  <FileDown className="w-4 h-4" />
                  Backup Session
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
                {displayedPrompts.length} items
              </span>
            </div>
          </div>

          {!isGenerating && displayedPrompts.length === 0 && (
            <div className="h-[30rem] border-2 border-dashed border-orange-100/60 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/30 dark:bg-slate-900/30">
              <div className="bg-orange-50/50 dark:bg-slate-800 p-6 rounded-full mb-6">
                {activeTab === 'recent' ? <Leaf className="w-16 h-16 text-orange-200 dark:text-orange-800" /> : <Bookmark className="w-16 h-16 text-orange-200 dark:text-orange-800" />}
              </div>
              <p className="text-xl font-serif font-bold text-orange-900/40 dark:text-orange-100/20">
                {activeTab === 'recent' ? 'Studio is empty' : 'Library is empty'}
              </p>
              <p className="text-sm mt-2 max-w-xs text-slate-400 dark:text-slate-600">
                {activeTab === 'recent' 
                  ? 'Enter a concept to see architectural prompt variations and AI renders.' 
                  : 'Save your favorite prompts to revisit them here later.'}
              </p>
            </div>
          )}

          <div className="space-y-8">
            {displayedPrompts.map((prompt) => (
              <div key={prompt.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md dark:hover:shadow-orange-900/10 transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-block px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-300 text-[9px] font-extrabold uppercase tracking-widest border border-orange-100/50 dark:border-orange-800/30">
                          {prompt.perspective}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleSavePrompt(prompt)}
                            className={`p-1.5 rounded-lg transition-colors ${isPromptSaved(prompt.id) ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'text-slate-300 dark:text-slate-700 hover:text-orange-400 dark:hover:text-orange-300'}`}
                            title={isPromptSaved(prompt.id) ? "Remove from Library" : "Save to Library"}
                          >
                            {isPromptSaved(prompt.id) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => startEditingPrompt(prompt)}
                            className={`p-1.5 rounded-lg transition-colors text-slate-300 dark:text-slate-700 hover:text-orange-400 dark:hover:text-orange-300 ${editingPromptId === prompt.id ? 'text-orange-500' : ''}`}
                            title="Edit prompt text"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-slate-100 leading-tight">{prompt.title}</h3>
                    </div>
                  </div>

                  {editingPromptId === prompt.id ? (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="mb-3 flex flex-wrap gap-2 py-2 overflow-x-auto custom-scrollbar no-scrollbar-y">
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mr-2 flex items-center">
                          <Plus className="w-3 h-3 mr-1" /> Quick Add:
                        </span>
                        {SUGGESTIONS.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAddSuggestion(s.label)}
                            className="px-3 py-1 rounded-lg bg-orange-50 dark:bg-slate-800 border border-orange-100 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-orange-400 hover:text-white dark:hover:bg-orange-500 transition-all flex-shrink-0"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/20 dark:bg-slate-950 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-orange-100 outline-none resize-none h-32"
                        value={tempPromptContent}
                        onChange={(e) => setTempPromptContent(e.target.value)}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button 
                          onClick={cancelEditingPrompt}
                          className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => savePromptContent(prompt.id)}
                          className="px-4 py-2 rounded-lg bg-orange-400 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed mb-6 font-medium bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-50 dark:border-slate-800">
                      "{prompt.content}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-8">
                    {prompt.technicalDetails.map((detail, idx) => (
                      <span key={idx} className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        {detail}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => handleVisualize(prompt.id, prompt.content)}
                      disabled={visualizingIds.has(prompt.id) || isEditingId === prompt.id || editingPromptId === prompt.id}
                      className="flex-[2] bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-30 group"
                    >
                      {visualizingIds.has(prompt.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      {visualizingIds.has(prompt.id) ? 'Rendering...' : 'Render Visualization'}
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(prompt.id, prompt.content)}
                      className={`flex-1 flex items-center justify-center gap-2.5 text-xs font-bold py-4 rounded-2xl transition-all active:scale-[0.98] border ${
                        copiedId === prompt.id 
                          ? 'bg-orange-500 text-white border-orange-500' 
                          : 'bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {copiedId === prompt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === prompt.id ? 'Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                </div>

                {/* Visualizing Placeholder */}
                {(visualizingIds.has(prompt.id) || isEditingId === prompt.id) && (
                  <div className="px-6 pb-6">
                    <div className="relative rounded-[1.5rem] overflow-hidden border border-orange-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-12 flex flex-col items-center justify-center min-h-[350px]">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-100/10 to-transparent -translate-x-full animate-shimmer" />
                      <div className="text-center relative z-10">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-400 mb-4 mx-auto" />
                        <h4 className="text-xl font-serif font-bold text-orange-900 dark:text-orange-100 mb-2">
                          {isEditingId === prompt.id ? 'Refining Architecture...' : 'Generating Render...'}
                        </h4>
                        <p className="text-slate-500 text-sm">{VISUALIZING_STEPS[loadingStepIndex]}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Image with Editing UI */}
                {visualizedImages[prompt.id] && !visualizingIds.has(prompt.id) && isEditingId !== prompt.id && (
                  <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative group rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950">
                      <img 
                        src={visualizedImages[prompt.id]} 
                        alt="AI Preview" 
                        className="w-full object-cover max-h-[500px]"
                      />
                      <a 
                        href={visualizedImages[prompt.id]} 
                        download="render.png"
                        className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-xl text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                    
                    {/* Image Editing Bar */}
                    <div className="mt-4 flex gap-3">
                      <div className="relative flex-1">
                        <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                        <input 
                          type="text"
                          placeholder="Refine visual (e.g., 'Make it more misty', 'Add person')"
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-orange-50 dark:border-slate-800 bg-orange-50/20 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/40"
                          value={editInstructions[prompt.id] || ''}
                          onChange={(e) => setEditInstructions(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleEditVisualization(prompt.id)}
                        />
                      </div>
                      <button
                        onClick={() => handleEditVisualization(prompt.id)}
                        className="px-6 py-3.5 bg-orange-400 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refine
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-orange-50 dark:border-slate-800 py-12 px-6 mt-16 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mb-1">
              &copy; 2024 LA Visual Prompt Engine
            </p>
            <p className="text-slate-300 dark:text-slate-600 text-[10px] uppercase tracking-widest font-bold">
              Optimized for Gemini Flash Image & Pro Preview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            <span className="text-orange-400 dark:text-orange-300 font-bold text-[10px] uppercase tracking-[0.2em]">Studio Pipeline Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
