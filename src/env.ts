import type { RuntimeObj } from './runtime_objs';
import { makeIntTypeObj, registerIntMethods, type IntTypeObj } from './runtime_objs/int';
import { makeMethodTypeObj, makeNativeMethodObj, registerMethodMethods, type MethodObj, type MethodTypeObj } from './runtime_objs/methods';
import { makeRootTypeObj, registerRootTypeMethods, type RootTypeObj } from './runtime_objs/root_type';
import { makeStringTypeObj, registerStringMethods, type StringTypeObj } from './runtime_objs/string';
import { makeSymbolObj, makeSymbolTypeObj, registerSymbolMethods, type SymbolObj, type SymbolTypeObj } from './runtime_objs/symbol';

/*
  Full environment
*/

export type Env = BootstrapEnv & {
  intTypeObj: WeakRef<IntTypeObj>,
  methodTypeObj: WeakRef<MethodTypeObj>,
  stringTypeObj: WeakRef<StringTypeObj>,
  thisSymbol: SymbolObj,
  showSym: SymbolObj,
}

export function createEnv(): Env {
  const bootstrapEnv = createBootstrapEnv();
  const rootTypeObj = bootstrapEnv.rootTypeObj.deref()!;
  const symbolTypeObj = bootstrapEnv.symbolTypeObj.deref()!;

  const intTypeObj = makeIntTypeObj(intern(bootstrapEnv, 'int'), rootTypeObj);
  const methodTypeObj = makeMethodTypeObj(intern(bootstrapEnv, 'method'), rootTypeObj);
  const stringTypeObj = makeStringTypeObj(intern(bootstrapEnv, 'string'), rootTypeObj);

  bindSymbol(bootstrapEnv, intTypeObj.name, intTypeObj);
  bindSymbol(bootstrapEnv, methodTypeObj.name, methodTypeObj);
  bindSymbol(bootstrapEnv, stringTypeObj.name, stringTypeObj);

  const thisSymbol = intern(bootstrapEnv, 'this');
  const showSym = intern(bootstrapEnv, 'show');

  const env: Env = {
    ...bootstrapEnv,
    intTypeObj: new WeakRef(intTypeObj),
    methodTypeObj: new WeakRef(methodTypeObj),
    stringTypeObj: new WeakRef(stringTypeObj),
    thisSymbol,
    showSym,
  };

  // Native `type` method - returns the object's type. Registering
  // here because it's the same for every type.
  const typeSym = intern(env, 'type');
  for (const typeObj of [rootTypeObj, symbolTypeObj, intTypeObj, methodTypeObj, stringTypeObj]) {
    typeObj.methods.set(typeSym, makeNativeMethodObj(
      typeObj,
      typeSym,
      0,
      (method) => getThisObj(method, env).type,
      methodTypeObj,
      env.currentFrame
    ));
  }

  registerIntMethods(env);
  registerStringMethods(env);
  registerSymbolMethods(env);
  registerMethodMethods(env);
  registerRootTypeMethods(env);

  return env;
}

/*
  Bootsrap environment
*/

export type BootstrapEnv = {
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: SymbolId,

  currentFrame: Frame,

  rootTypeObj: WeakRef<RootTypeObj>,
  symbolTypeObj: WeakRef<SymbolTypeObj>,
}

function createBootstrapEnv(): BootstrapEnv {
  // Phase I: Create bootstrapped type objects without names (circular dependency)
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  const env: BootstrapEnv = {
    currentFrame: makeFrame(),
    symbolTable: new Map(),
    nextSymbolId: 0,
    rootTypeObj: new WeakRef(rootTypeObj),
    symbolTypeObj: new WeakRef(symbolTypeObj),
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

export function makeFrame(parent?: Frame): Frame {
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

export function withFrame<T>(env: BootstrapEnv, parent: Frame, fn: () => T): T {
  const savedFrame = env.currentFrame;
  env.currentFrame = makeFrame(parent);
  try {
    return fn();
  } finally {
    env.currentFrame = savedFrame;
  }
}

/*
  Symbols
*/

export type SymbolId = number;

export function intern(env: BootstrapEnv, symbolName: string, binding?: RuntimeObj): SymbolObj {
  let symbolObj = env.symbolTable.get(symbolName);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, env.symbolTypeObj.deref()!);
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
  bindSymbolInFrame(env.currentFrame, symbol, value);
}

export function bindSymbolInFrame(frame: Frame, symbol: SymbolObj, value: RuntimeObj) {
  frame.bindings.set(symbol.id, value);
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

export function getThisObj<T extends RuntimeObj>(method: MethodObj, env: Env): T {
  return method.closureFrame.bindings.get(env.thisSymbol.id)! as T;
}
