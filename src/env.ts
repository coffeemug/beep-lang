import type { RuntimeObj } from './runtime_objs';
import { makeIntTypeObj, type IntTypeObj } from './runtime_objs/int';
import { makeMethodTypeObj, type MethodTypeObj } from './runtime_objs/methods';
import { makeRootTypeObj, type RootTypeObj } from './runtime_objs/root_type';
import { makeSymbolObj, makeSymbolTypeObj, type SymbolObj, type SymbolTypeObj } from './runtime_objs/symbol';

/*
  Full environment
*/

export type Env = BootstrapEnv & {
  cachedIntTypeObj: WeakRef<IntTypeObj>,
  cachedMethodTypeObj: WeakRef<MethodTypeObj>,
}

export function createEnv(): Env {
  const bootstrapEnv = createBootstrapEnv();
  return registerBuiltinTypes(bootstrapEnv);
}

function registerBuiltinTypes(bootstrapEnv: BootstrapEnv): Env {
  const rootTypeObj = bootstrapEnv.cachedRootTypeObj.deref()!;

  const intTypeObj = makeIntTypeObj(intern(bootstrapEnv, 'int'), rootTypeObj);
  const methodTypeObj = makeMethodTypeObj(intern(bootstrapEnv, 'method'), rootTypeObj);

  bindSymbol(bootstrapEnv, intTypeObj.name, intTypeObj);
  bindSymbol(bootstrapEnv, methodTypeObj.name, methodTypeObj)

  return {
    ...bootstrapEnv,
    cachedIntTypeObj: new WeakRef(intTypeObj),
    cachedMethodTypeObj: new WeakRef(methodTypeObj),
  };
}

/*
  Bootsrap environment
*/

export type BootstrapEnv = {
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: SymbolId,

  currentFrame: Frame,

  cachedRootTypeObj: WeakRef<RootTypeObj>,
  cachedSymbolTypeObj: WeakRef<SymbolTypeObj>,
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

/*
  Frames
*/

export type Frame = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Frame | null,
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

/*
  Symbols
*/

export type SymbolId = number;

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

/*
  Bindings
*/

export function bindSymbol(env: BootstrapEnv, symbol: SymbolObj, value: RuntimeObj) {
  env.currentFrame.bindings.set(symbol.id, value);
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
