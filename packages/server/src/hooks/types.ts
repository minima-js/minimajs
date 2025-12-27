export type LifecycleHook = "preHandler" | "transform" | "send" | "error" | "sent" | "notFound" | "timeout" | "close" | "listen" | "ready" | "register";

export type HookCallback = (...args: unknown[]) => void | Promise<void>;

export type HookStore = Map<LifecycleHook, Set<HookCallback>>;
