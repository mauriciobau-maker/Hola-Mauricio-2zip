import type { ParryTool } from "./parry.types";

export class ParryToolRegistry {
  private readonly tools = new Map<string, ParryTool<any, any>>();

  register<TArgs, TResult>(tool: ParryTool<TArgs, TResult>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Parry tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ParryTool<any, any> | undefined {
    return this.tools.get(name);
  }

  list(): Array<Pick<ParryTool, "name" | "description">> {
    return Array.from(this.tools.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }
}
