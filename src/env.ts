import type { RuntimeObj } from './runtime_objs';
import { makeIntTypeObj, type IntTypeObj } from './runtime_objs/int';
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
  cachedIntTypeObj: WeakRef<IntTypeObj>,
}

export type Frame = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Frame | null,
}

export function createEnv(): Env {
  const env = bootstrapEnv();
  registerBuiltinTypes(env);
  return env;
}

function bootstrapEnv(): Env {
  // Phase I: Create bootstrapped type objects without names (circular dependency)
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  const env: Env = {
    currentFrame: makeFrame(),
    symbolTable: new Map(),
    nextSymbolId: 0,
    cachedRootTypeObj: new WeakRef(rootTypeObj),
    cachedSymbolTypeObj: new WeakRef(symbolTypeObj),
    cachedIntTypeObj: undefined!,
  };

  // Phase II: Assign and bind names now that symbolTypeObj exists
  rootTypeObj.name = intern(env, 'type');
  symbolTypeObj.name = intern(env, 'symbol');

  bindSymbol(env, rootTypeObj.name, rootTypeObj);
  bindSymbol(env, symbolTypeObj.name, symbolTypeObj);

  return env;
}

function registerBuiltinTypes(env: Env): void {
  const rootTypeObj = env.cachedRootTypeObj.deref()!;

  // int
  const intTypeObj = makeIntTypeObj(intern(env, 'int'), rootTypeObj);
  env.cachedIntTypeObj = new WeakRef(intTypeObj);
  bindSymbol(env, intTypeObj.name, intTypeObj);
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

export function intern(env: Env, symbolName: string, binding?: RuntimeObj): SymbolObj {
  let symbolObj = env.symbolTable.get(symbolName);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, env.cachedSymbolTypeObj.deref()!);
    env.symbolTable.set(symbolName, symbolObj);
    env.nextSymbolId++;
  }

  if (binding) {
    bindSymbol(env, symbolObj, binding);
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
