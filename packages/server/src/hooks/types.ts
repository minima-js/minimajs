export type LifecycleHook = "close" | "send" | "listen" | "ready" | "register";

export type HookCallback = (...args: unknown[]) => void | Promise<void>;

export type HookStore = Map<LifecycleHook, Set<HookCallback>>;
