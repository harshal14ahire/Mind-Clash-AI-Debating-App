export interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  modelId?: string;
  modelName?: string;
  timestamp: number;
}

export interface ChatConfig {
  seedTopic: string;
  models: Model[];
  mode: "1v1" | "group";
  maxTurns: number;
  maxTokensPerTurn: number;
}
