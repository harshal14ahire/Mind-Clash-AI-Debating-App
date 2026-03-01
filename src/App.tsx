import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SetupScreen } from "./components/SetupScreen";
import { ChatScreen } from "./components/ChatScreen";
import { ChatConfig } from "./types";
import { Bot, Sparkles } from "lucide-react";

export default function App() {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = (newConfig: ChatConfig) => {
    setConfig(newConfig);
    setIsStarted(true);
  };

  const handleReset = () => {
    setIsStarted(false);
    setConfig(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0b141a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a884]/10 text-[#00a884] shadow-inner">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Mind<span className="text-[#00a884]">Clash</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Intelligence Colliding
              </p>
            </div>
          </div>
          
          {isStarted && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-full bg-[#00a884] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#00a884]/20 transition-all hover:bg-[#06cf9c] active:scale-95"
            >
              <Sparkles size={14} />
              New Clash
            </button>
          )}
        </div>
      </header>

      <main className="pt-16">
        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <SetupScreen onStart={handleStart} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {config && <ChatScreen config={config} onReset={handleReset} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

