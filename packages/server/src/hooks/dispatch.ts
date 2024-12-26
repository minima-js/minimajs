import { getHooks } from "../internal/context.js";

export async function dispatchSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}

export async function dispatchError(_: {}, _1: {}, error: unknown) {
  const hooks = getHooks();
  for (const hook of hooks.onError) {
    await hook(error);
  }
}
