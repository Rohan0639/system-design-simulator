import React, { useState } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { useStore } from '../store/useStore';

export const AIDesignPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const generateAIDesign = useStore((state) => state.generateAIDesign);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      await generateAIDesign(prompt);
      setPrompt('');
    } catch (err) {
      console.error(err);
      alert("Failed to generate design. Ensure your backend has a valid GROK_API_KEY.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass p-6 rounded-3xl border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 mb-8">
      <div className="flex items-center gap-3 mb-4 text-primary">
        <div className="p-2 rounded-lg bg-primary/20">
          <Sparkles size={20} className="animate-pulse" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">AI Architect</h3>
      </div>
      
      <div className="relative group">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your system (e.g., 'E-commerce platform with global caching and separate auth service')..."
          className="w-full bg-background/50 border border-border rounded-2xl p-4 pr-14 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all min-h-[120px] resize-none placeholder:opacity-40"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="absolute bottom-4 right-4 p-3 bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 group-hover:scale-105 active:scale-95"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
      
      <div className="flex items-center gap-2 mt-4 px-1">
        <div className="flex -space-x-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-5 h-5 rounded-full border-2 border-background bg-border flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-tr from-primary to-accent opacity-60" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-foreground/40 font-medium italic">
          Join 2,400+ architects using Grok design engine
        </p>
      </div>
    </div>
  );
};
