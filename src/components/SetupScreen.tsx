import React, { useState, useEffect } from "react";
import { Model, ChatConfig } from "../types";
import { Users, User, Hash, Play, Loader2, Info, AlertCircle, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SetupScreenProps {
  onStart: (config: ChatConfig) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedTopic, setSeedTopic] = useState("");
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [mode, setMode] = useState<"1v1" | "group">("1v1");
  const [maxTurns, setMaxTurns] = useState(10);
  const [maxTokensPerTurn, setMaxTokensPerTurn] = useState(200);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        
        const filtered = data.data
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            pricing: {
              prompt: (parseFloat(m.pricing?.prompt || "0") * 1000000).toFixed(4),
              completion: (parseFloat(m.pricing?.completion || "0") * 1000000).toFixed(4),
            }
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        setModels(filtered);
        
        if (filtered.length >= 2) {
          setSelectedModels([filtered[0], filtered[1]]);
        }
      } catch (error) {
        console.error("Failed to fetch models", error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModelToggle = (model: Model) => {
    if (selectedModels.find((m) => m.id === model.id)) {
      if (selectedModels.length > 2) {
        setSelectedModels(selectedModels.filter((m) => m.id !== model.id));
      }
    } else {
      if (mode === "1v1" && selectedModels.length >= 2) {
        setSelectedModels([selectedModels[0], model]);
      } else {
        setSelectedModels([...selectedModels, model]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedTopic.trim()) return;
    onStart({
      seedTopic,
      models: selectedModels,
      mode,
      maxTurns,
      maxTokensPerTurn,
    });
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-zinc-400">Fetching available models...</p>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-xl font-bold text-white">No Models Found</h3>
        <p className="max-w-md text-zinc-400">
          We couldn't find any models on your OpenRouter account. 
          Please check your API key and OpenRouter settings.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-emerald-500 px-6 py-2 font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const isStartDisabled = mode === "1v1" ? selectedModels.length !== 2 : selectedModels.length < 3;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#0b141a] pb-32">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Mind<span className="text-emerald-500">Clash</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Where the world's most powerful AI minds collide.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bento Grid Layout */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Topic Card */}
            <motion.section 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="md:col-span-3 rounded-3xl border border-white/5 bg-[#202c33] p-6 shadow-xl"
            >
              <label className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00a884]">
                <Hash size={16} />
                Debate Catalyst
              </label>
              <textarea
                required
                value={seedTopic}
                onChange={(e) => setSeedTopic(e.target.value)}
                placeholder="Ignite the conversation with a spark of thought..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b141a] p-4 text-white placeholder:text-zinc-600 focus:border-[#00a884]/50 focus:outline-none focus:ring-2 focus:ring-[#00a884]/20"
                rows={2}
              />
            </motion.section>

            {/* Mode Card */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-white/5 bg-[#202c33] p-6 shadow-xl"
            >
              <label className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00a884]">
                <Users size={16} />
                Mode
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("1v1");
                    if (selectedModels.length > 2) setSelectedModels(selectedModels.slice(0, 2));
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 text-sm font-bold transition-all",
                    mode === "1v1" ? "bg-[#00a884] text-white" : "bg-[#0b141a] text-zinc-400 hover:text-white"
                  )}
                >
                  <User size={16} />
                  1v1 Duel
                </button>
                <button
                  type="button"
                  onClick={() => setMode("group")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 text-sm font-bold transition-all",
                    mode === "group" ? "bg-[#00a884] text-white" : "bg-[#0b141a] text-zinc-400 hover:text-white"
                  )}
                >
                  <Users size={16} />
                  Group Chat
                </button>
              </div>
            </motion.section>

            {/* Settings Card */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 rounded-3xl border border-white/5 bg-[#202c33] p-6 shadow-xl"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00a884]">
                    <Hash size={16} />
                    Max Turns
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={isNaN(maxTurns) ? "" : maxTurns}
                    onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#0b141a] px-4 py-3 text-white focus:border-[#00a884]/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00a884]">
                    <Hash size={16} />
                    Tokens/Turn
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={4000}
                    step={50}
                    value={isNaN(maxTokensPerTurn) ? "" : maxTokensPerTurn}
                    onChange={(e) => setMaxTokensPerTurn(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#0b141a] px-4 py-3 text-white focus:border-[#00a884]/50 focus:outline-none"
                  />
                </div>
              </div>
            </motion.section>

            {/* Model Selection Card */}
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-3 rounded-3xl border border-white/5 bg-[#202c33] p-6 shadow-xl"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#00a884]">
                  <Bot size={16} />
                  Participating Minds
                </label>
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search all models (GPT, Claude, Gemini...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0b141a] px-5 py-3 text-sm text-white focus:border-[#00a884]/50 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredModels.map((model) => {
                  const isSelected = selectedModels.find((m) => m.id === model.id);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleModelToggle(model)}
                      className={cn(
                        "group relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                        isSelected 
                          ? "border-[#00a884] bg-[#00a884]/10" 
                          : "border-white/5 bg-[#0b141a] hover:border-white/20"
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className={cn("text-sm font-bold", isSelected ? "text-[#00a884]" : "text-white")}>
                          {model.name}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-[#00a884]" />}
                      </div>
                      <span className="line-clamp-1 text-[10px] text-zinc-500">
                        {model.id}
                      </span>
                      <div className="mt-2 text-[9px] font-bold text-zinc-600">
                        ${(parseFloat(model.pricing?.prompt || "0") + parseFloat(model.pricing?.completion || "0")).toFixed(2)}/1M
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </div>
        </form>
      </div>

      {/* Sticky Footer for Selected Models & Start Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#202c33]/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Selected:</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00a884] text-[10px] font-bold text-white">
                {selectedModels.length}
              </span>
            </div>
            <AnimatePresence>
              {selectedModels.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 rounded-full bg-[#0b141a] border border-white/5 px-3 py-1 text-[10px] font-bold text-[#00a884]"
                >
                  {m.name}
                  <button onClick={() => handleModelToggle(m)} className="hover:text-red-400">
                    <X size={10} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedModels.length > 0 && (
              <button 
                onClick={() => setSelectedModels([])}
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400"
              >
                Clear All
              </button>
            )}
            {selectedModels.length === 0 && <span className="text-xs text-zinc-600 italic">No champions selected</span>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isStartDisabled}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#00a884] px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:bg-[#06cf9c] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Play size={20} fill="currentColor" />
            Ignite Clash
          </button>
        </div>
      </div>
    </div>
  );
}

function Bot({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
