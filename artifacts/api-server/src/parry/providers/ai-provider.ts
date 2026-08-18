export type AIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type AIRequest = {
  messages: AIMessage[];
  model?: string;
  maxOutputTokens?: number;
};

export type AIResponse = {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * Provider-neutral contract. Parry must not import a vendor SDK directly.
 * V0.1 can run without an AI provider while tools/security are validated.
 */
export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
