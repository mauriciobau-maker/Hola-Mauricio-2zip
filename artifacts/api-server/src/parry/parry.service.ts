import type { AIMessage, AIProvider } from "./providers/ai-provider";
import { buildParryContext } from "./parry.context";
import { ParryToolRegistry } from "./parry.tool-registry";

export type ParryUser = {
  id?: string;
  playerId?: number | null;
  clubId?: number | null;
  role?: string | null;
  language?: string | null;
};

export class ParryService {
  constructor(
    private readonly tools: ParryToolRegistry,
    private readonly provider?: AIProvider,
  ) {}

  listTools() {
    return this.tools.list();
  }

  async ask(input: {
    user: ParryUser | null | undefined;
    message: string;
  }) {
    const context = buildParryContext(input.user);
    if (!context) {
      return {
        ok: false as const,
        error: "UNAUTHENTICATED" as const,
        message: "Parry requires an authenticated user.",
      };
    }

    if (!this.provider) {
      return {
        ok: false as const,
        error: "AI_PROVIDER_NOT_CONFIGURED" as const,
        message: "Parry is ready, but no AI provider is configured yet.",
      };
    }

    const messages: AIMessage[] = [
      {
        role: "system",
        content:
          `You are Parry, the sports assistant for Padel Tracker IA. ` +
          `Never invent data or permissions. The trusted club context is ${context.clubId ?? "none"}. ` +
          `Respond in ${context.language}.`,
      },
      { role: "user", content: input.message },
    ];

    const response = await this.provider.generate({ messages });
    return { ok: true as const, response };
  }
}
