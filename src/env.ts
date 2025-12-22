import type { RuntimeObj } from './runtime_objs';
import { makeIntTypeObj, type IntTypeObj } from './runtime_objs/int';
import { makeRootTypeObj, type RootTypeObj } from './runtime_objs/root_type';
import { makeSymbolObj, makeSymbolTypeObj, type SymbolObj, type SymbolTypeObj } from './runtime_objs/symbol';

export type SymbolId = number;

export type BootstrapEnv = {
  currentFrame: Frame,
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: number,
  cachedRootTypeObj: WeakRef<RootTypeObj>,
  cachedSymbolTypeObj: WeakRef<SymbolTypeObj>,
}

export type Env = BootstrapEnv & {
  cachedIntTypeObj: WeakRef<IntTypeObj>,
}

export type Frame = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Frame | null,
}

export function createEnv(): Env {
  const bootstrapEnv = createBootstrapEnv();
  return registerBuiltinTypes(bootstrapEnv);
}

function createBootstrapEnv(): BootstrapEnv {
  // Phase I: Create bootstrapped type objects without names (circular dependency)
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  const env: BootstrapEnv = {
    currentFrame: makeFrame(),
    symbolTable: new Map(),
    nextSymbolId: 0,
    cachedRootTypeObj: new WeakRef(rootTypeObj),
    cachedSymbolTypeObj: new WeakRef(symbolTypeObj),
  };

  // Phase II: Assign and bind names now that symbolTypeObj exists
  rootTypeObj.name = intern(env, 'type');
  symbolTypeObj.name = intern(env, 'symbol');

  bindSymbol(env, rootTypeObj.name, rootTypeObj);
  bindSymbol(env, symbolTypeObj.name, symbolTypeObj);

  return env;
}

function registerBuiltinTypes(bootstrapEnv: BootstrapEnv): Env {
  const rootTypeObj = bootstrapEnv.cachedRootTypeObj.deref()!;

  // int
  const intTypeObj = makeIntTypeObj(intern(bootstrapEnv, 'int'), rootTypeObj);
  bindSymbol(bootstrapEnv, intTypeObj.name, intTypeObj);

  return {
    ...bootstrapEnv,
    cachedIntTypeObj: new WeakRef(intTypeObj),
  };
}

function makeFrame(parent?: Frame): Frame {
  return {
    bindings: new Map(),
    parent: parent ?? null,
  }
}

export function pushFrame(env: BootstrapEnv): Frame {
  env.currentFrame = makeFrame(env.currentFrame);
  return env.currentFrame;
}

export function popFrame(env: BootstrapEnv) {
  if (!env.currentFrame.parent) {
    throw new Error("This should never happen!")
  }
  env.currentFrame = env.currentFrame.parent;
}

export function intern(env: BootstrapEnv, symbolName: string, binding?: RuntimeObj): SymbolObj {
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

export function findBinding(env: BootstrapEnv, symbol: SymbolObj) {
  return findBinding_(env.currentFrame, symbol);
}

function findBinding_(frame: Frame | null, symbol: SymbolObj): RuntimeObj | null {
  if (!frame) {
    return null;
  }

  const binding = frame.bindings.get(symbol.id);
  return binding ?? findBinding_(frame.parent, symbol);
}

export function bindSymbol(env: BootstrapEnv, symbol: SymbolObj, value: RuntimeObj) {
  env.currentFrame.bindings.set(symbol.id, value);
}
