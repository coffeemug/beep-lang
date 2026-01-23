import type { RuntimeObj } from "../runtime_objects";
import { addBinding, type ScopeObj } from "./scope";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";
import { ReturnSignal } from "../runtime/interpreter";

export type FunctionTypeObj =
  & RuntimeObjMixin<'FunctionTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type FunctionObj =
  & RuntimeObjMixin<'FunctionObj', FunctionTypeObj>
  & {
    name: SymbolObj | null,
    scopeClosure: ScopeObj,
  }
  & FunctionImpl;

type FunctionImpl =
      { mode: 'interpreted', argNames: SymbolObj[], body: Expr }
    | { mode: 'native', argCount: number, nativeFn: NativeFn };

export type NativeFn = (args: RuntimeObj[]) => RuntimeObj;

export function initFunction(k: BeepContext) {
  const { rootTypeObj, kernelModule, intern } = k;

  const functionTypeObj: FunctionTypeObj = {
    tag: 'FunctionTypeObj',
    type: rootTypeObj,
    name: intern('function'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(kernelModule, functionTypeObj.name, functionTypeObj);
  k.functionTypeObj = functionTypeObj;

  k.makeFunctionObj = (scopeClosure: ScopeObj, name: SymbolObj | null, argNames: SymbolObj[], body: Expr): FunctionObj => ({
    tag: 'FunctionObj',
    type: functionTypeObj,
    name,
    mode: 'interpreted',
    argNames,
    body,
    scopeClosure,
  });

  k.makeNativeFunctionObj = (name: SymbolObj | null, argCount: number, nativeFn: NativeFn, scopeClosure?: ScopeObj): FunctionObj => ({
    tag: 'FunctionObj',
    type: functionTypeObj,
    name,
    mode: 'native',
    argCount,
    nativeFn,
    scopeClosure: scopeClosure ?? k.makeScopeObj(),
  });

  k.callFunction = (fn: FunctionObj, args: RuntimeObj[]): RuntimeObj => {
    const expectedCount = fn.mode === 'native' ? fn.argCount : fn.argNames.length;
    if (args.length !== expectedCount) {
      const fnName = fn.name ? fn.name.name : '<function>';
      throw new Error(`${fnName} expects ${expectedCount} args, got ${args.length}`);
    }

    if (fn.mode === 'native') {
      return fn.nativeFn(args);
    }

    let callScope = k.makeScopeObj(fn.scopeClosure);
    for (let i = 0; i < fn.argNames.length; i++) {
      addBinding(fn.argNames[i], args[i], callScope);
    }

    try {
      return k.evaluate(fn.body, callScope).value;
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    }
  }
}

export function initFunctionMethods(k: BeepContext) {
  const { makeStringObj, functionTypeObj, makeDefMethodNative: makeDefNative } = k;
  const defMethod = makeDefNative<FunctionObj>(functionTypeObj);

  defMethod('show', 0, thisObj =>
    makeStringObj(thisObj.name ? `<function ${thisObj.name.name}>` : '<lambda>'));
}
