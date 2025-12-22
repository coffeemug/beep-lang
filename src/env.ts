// Environment for beep language

import type { RuntimeObj } from './runtime_objs';
import { makeRootTypeObj, type RootTypeObj } from './runtime_objs/root_type';
import { makeSymbolObj, makeSymbolTypeObj, type SymbolObj, type SymbolTypeObj } from './runtime_objs/symbol';

export type SymbolId = number;

export type Env = {
  currentFrame: Frame,
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: number,

  /* Cached frequently used objects */
  cachedRootTypeObj: WeakRef<RootTypeObj>,
  cachedSymbolTypeObj: WeakRef<SymbolTypeObj>,
}

export type Frame = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Frame | null,
}

export function createEnv(): Env {
  const rootTypeObj = makeRootTypeObj();
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj);

  const env = {
    currentFrame: makeFrame(),
    symbolTable: new Map(),
    nextSymbolId: 0,
    cachedRootTypeObj: new WeakRef(rootTypeObj),
    cachedSymbolTypeObj: new WeakRef(symbolTypeObj),
  };

  const typeSym = intern(env, 'type');
  bindSymbol(env, typeSym, rootTypeObj);

  const symbolSym = intern(env, 'symbol');
  bindSymbol(env, symbolSym, symbolTypeObj);

  return env;
}

function makeFrame(parent?: Frame): Frame {
  return {
    bindings: new Map(),
    parent: parent ?? null,
  }
}

export function pushFrame(env: Env): Frame {
  env.currentFrame = makeFrame(env.currentFrame);
  return env.currentFrame;
}

export function popFrame(env: Env) {
  if (!env.currentFrame.parent) {
    throw new Error("This should never happen!")
  }
  env.currentFrame = env.currentFrame.parent;
}

export function intern(env: Env, symbolName: string): SymbolObj {
  let symbolObj = env.symbolTable.get(symbolName);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, env.cachedSymbolTypeObj.deref()!);
    env.symbolTable.set(symbolName, symbolObj);
    env.nextSymbolId++;
  }
  return symbolObj;
}

export function findBinding(env: Env, symbol: SymbolObj) {
  return findBinding_(env.currentFrame, symbol);
}

function findBinding_(frame: Frame | null, symbol: SymbolObj): RuntimeObj | null {
  if (!frame) {
    return null;
  }

  const binding = frame.bindings.get(symbol.id);
  return binding ?? findBinding_(frame.parent, symbol);
}

export function bindSymbol(env: Env, symbol: SymbolObj, value: RuntimeObj) {
  env.currentFrame.bindings.set(symbol.id, value);
}