export * from "./app.js";
export * from "./context.js";
export * from "../hooks/types.js";
export * from "./route.js";
export * from "./response.js";
export * from "./server.js";

export type Signals = NodeJS.Signals;

// ============================================================================
// Utility Types
// ============================================================================

export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
export type GenericCallback = (...args: any[]) => any;
