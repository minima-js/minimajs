// Re-export all hook types from interfaces
export type {
  LifecycleHook,
  OnRequestHook,
  OnTransformHook,
  OnSendHook,
  OnErrorHook,
  OnSentHook,
  OnErrorSentHook,
  OnTimeoutHook,
  OnCloseHook,
  OnListenHook,
  OnReadyHook,
  OnRegisterHook,
  HookCallback,
  HookStore,
} from "../interfaces/hooks.js";

// Re-export defer and onError functionality from plugins
export { defer, onError, minimajs as minimaPlugin } from "../plugins/minimajs.js";
