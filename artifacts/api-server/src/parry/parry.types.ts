export type ParryContext = {
  userId: number;
  playerId: number | null;
  clubId: number | null;
  role: string | null;
  language: string;
};

export type ParryToolContext = ParryContext;

export type ParryToolResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: "UNAUTHENTICATED" | "NO_PLAYER" | "NO_CLUB" | "FORBIDDEN" | "NOT_FOUND" | "ERROR";
  message?: string;
};

export type ParryTool<TArgs = unknown, TResult = unknown> = {
  name: string;
  description: string;
  execute: (args: TArgs, context: ParryToolContext) => Promise<ParryToolResult<TResult>>;
};

export type ParryProfile = {
  playerId: number;
  name: string;
  nickname: string | null;
  clubId: number;
  clubName: string | null;
  elo: number | null;
  language: string | null;
};
