// Environment for beep language

import type { RuntimeObj } from './runtime_objs';
import { makeSymbolObj, type SymbolObj } from './runtime_objs/symbol';

export type Env = {
  symbols: Map<string, SymbolObj>;
  parent: Env | null;
};

export function createEnv(parent: Env | null = null): Env {
  return {
    symbols: new Map(),
    parent,
  };
}

export function intern(env: Env, name: string, value: RuntimeObj | null = null): SymbolObj {
  let sym = env.symbols.get(name);
  if (!sym) {
    sym = makeSymbolObj(name, env);
    env.symbols.set(name, sym);
  }

  if (value) {
    sym.value = value;
  }

  return sym;
}

export function findSymbol(env: Env, name: string): SymbolObj | null {
  const value = env.symbols.get(name);
  if (value !== undefined) return value;
  if (env.parent) return findSymbol(env.parent, name);
  return null;
}
