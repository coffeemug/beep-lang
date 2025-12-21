import type { RuntimeObj } from "./runtime_objs";

export function assertObj<T extends RuntimeObj>(
  obj: RuntimeObj | null,
  tag: T['tag']
): asserts obj is T {
  if (obj === null || obj.tag !== tag) {
    throw new Error(`${tag} object not found in the environment`);
  }
}
