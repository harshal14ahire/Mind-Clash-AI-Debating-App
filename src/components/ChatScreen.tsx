import { useState, useEffect, useRef, useCallback } from "react";
import { ChatConfig, Message, Model } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Square, Loader2, RefreshCw, AlertCircle, Bot, User, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatScreenProps {
  config: ChatConfig;
  onReset: () => void;
}

export function ChatScreen({ config, onReset }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const startNextTurn = useCallback(async (turnIndex: number, currentMessages: Message[]) => {
    if (isStopped || turnIndex >= config.maxTurns) {
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    const modelIndex = turnIndex % config.models.length;
    const model = config.models[modelIndex];
    setActiveModel(model);

    // Construct prompt
    let promptMessages = [];
    const shortFormatInstruction = "IMPORTANT: Keep your response very short and conversational, as if you are chatting on WhatsApp or iMessage. Use 1-3 sentences maximum. Be direct and personal.";
    
    if (turnIndex === 0) {
      // First turn: System prompt + Seed Topic
      promptMessages = [
        {
          role: "system",
          content: `You are ${model.name}. You are participating in a ${config.mode === "1v1" ? "MindClash duel" : "MindClash group discussion"} about: "${config.seedTopic}". 
          ${shortFormatInstruction}
          Your name is ${model.name}.`,
        },
        {
          role: "user",
          content: `The catalyst is: ${config.seedTopic}. Please ignite the clash.`,
        },
      ];
    } else {
      // Subsequent turns: System prompt + Full history
      promptMessages = [
        {
          role: "system",
          content: `You are ${model.name}. You are in a ${config.mode === "1v1" ? "MindClash duel" : "MindClash group discussion"} with ${config.models.filter(m => m.id !== model.id).map(m => m.name).join(", ")}. 
          The catalyst is: "${config.seedTopic}". 
          Respond to the previous messages in character. 
          ${shortFormatInstruction}`,
        },
        ...currentMessages.map((m) => ({
          role: m.role,
          content: m.role === "assistant" ? `[${m.modelName}]: ${m.content}` : m.content,
        })),
      ];
    }

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.id,
          messages: promptMessages,
          stream: true,
          max_tokens: config.maxTokensPerTurn,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch: ${response.statusText}`);
      }

      const contentType = response.headers.get("Content-Type");
      if (!contentType || !contentType.includes("text/event-stream")) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Unexpected response format from server");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        modelId: model.id,
        modelName: model.name,
        timestamp: Date.now(),
      };

      const updatedMessages = [...currentMessages, newMessage];
      setMessages(updatedMessages);
      setStreamingContent("");
      setCurrentTurn(turnIndex + 1);
      
      // Artificial delay between turns for better UX
      setTimeout(() => {
        startNextTurn(turnIndex + 1, updatedMessages);
      }, 1500);

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Generation aborted");
      } else {
        console.error("Turn error:", err);
        setError(err.message || "An unexpected error occurred.");
        setIsGenerating(false);
      }
    }
  }, [config, isStopped]);

  // Start the conversation on mount
  useEffect(() => {
    startNextTurn(0, []);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStop = () => {
    setIsStopped(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleResume = () => {
    setIsStopped(false);
    startNextTurn(currentTurn, messages);
  };

  return (
    <div className="relative mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col overflow-hidden bg-[#0b141a]">
      {/* WhatsApp Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }} />

      {/* Topic Header */}
      <div className="relative z-10 border-b border-white/5 bg-[#202c33] p-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00a884]">
              Clash Catalyst
            </h3>
            <p className="mt-0.5 truncate text-base font-medium text-[#e9edef]">
              {config.seedTopic}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-tighter text-[#8696a0]">
                Clash Turn
              </p>
              <p className="text-lg font-bold tabular-nums text-[#e9edef]">
                {currentTurn}/{config.maxTurns}
              </p>
            </div>
            {isGenerating ? (
              <button
                onClick={handleStop}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                title="Halt Clash"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : isStopped && currentTurn < config.maxTurns ? (
              <button
                onClick={handleResume}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884]/10 text-[#00a884] transition-all hover:bg-[#00a884] hover:text-white"
                title="Resume Clash"
              >
                <RefreshCw size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              index={idx} 
              isRight={idx % 2 !== 0}
            />
          ))}
          
          {isGenerating && streamingContent && (
            <MessageBubble 
              key="streaming" 
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingContent,
                modelId: activeModel?.id,
                modelName: activeModel?.name,
                timestamp: Date.now()
              }} 
              isStreaming 
              isRight={currentTurn % 2 !== 0}
            />
          )}

          {isGenerating && !streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl bg-[#202c33] p-3 shadow-sm max-w-fit"
            >
              <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-[#00a884]/20 text-[#00a884]">
                <Loader2 size={12} className="animate-spin" />
              </div>
              <p className="text-xs font-medium text-[#8696a0]">
                <span className="text-[#00a884]">{activeModel?.name}</span> is typing...
              </p>
            </motion.div>
          )}

          {currentTurn >= config.maxTurns && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#00a884]/10 text-[#00a884]">
                <RefreshCw size={24} />
              </div>
              <h4 className="text-lg font-bold text-[#e9edef]">Clash Concluded</h4>
              <p className="mt-1 text-sm text-[#8696a0]">The maximum number of turns has been reached.</p>
              <button
                onClick={onReset}
                className="mt-4 flex items-center gap-2 rounded-full bg-[#00a884] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#06cf9c]"
              >
                <Trash2 size={14} />
                Start New Clash
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Popup Modal */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#202c33] p-6 shadow-2xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#e9edef]">Something went wrong</h3>
              <p className="mt-2 text-[#8696a0]">{error}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setError(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-[#e9edef] hover:bg-white/10"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    startNextTurn(currentTurn, messages);
                  }}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600"
                >
                  Retry Turn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ 
  message, 
  isStreaming = false,
  index = 0,
  isRight = false
}: { 
  message: Message; 
  isStreaming?: boolean;
  index?: number;
  isRight?: boolean;
  key?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full",
        isRight ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "relative max-w-[80%] rounded-lg px-3 py-2 shadow-sm",
        isRight 
          ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none" 
          : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
      )}>
        {/* Bubble Tail */}
        <div className={cn(
          "absolute top-0 h-3 w-3",
          isRight 
            ? "-right-2 bg-[#005c4b]" 
            : "-left-2 bg-[#202c33]"
        )} style={{ clipPath: isRight ? 'polygon(0 0, 0% 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />

        <div className="mb-1 flex items-center justify-between gap-4">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isRight ? "text-[#00a884]" : "text-[#8696a0]"
          )}>
            {message.modelName}
          </span>
        </div>
        
        <p className="whitespace-pre-wrap text-[14.5px] leading-snug">
          {message.content}
          {isStreaming && (
            <span className="ml-1 inline-block h-3.5 w-1 animate-pulse bg-[#00a884] align-middle" />
          )}
        </p>
        
        <div className="mt-1 flex justify-end">
          <span className="text-[9px] font-medium text-[#8696a0]/80">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
