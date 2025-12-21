// Environment for beep language

import type { RuntimeObj } from './runtime_objs';

export type Env = {
  symbols: Map<string, RuntimeObj>;
  parent: Env | null;
};

export function createEnv(parent: Env | null = null): Env {
  return {
    symbols: new Map(),
    parent,
  };
}

export function bindSym(env: Env, name: string, value: RuntimeObj): void {
  env.symbols.set(name, value);
}

export function findSym(env: Env, name: string): RuntimeObj | null {
  const value = env.symbols.get(name);
  if (value !== undefined) return value;
  if (env.parent) return findSym(env.parent, name);
  return null;
}
