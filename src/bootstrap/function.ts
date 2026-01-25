import type { RuntimeObj } from "../runtime_objects";
import { type ScopeObj, scopedBindings } from "./scope";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";
import { ReturnSignal } from "../runtime/interpreter";
import { matchPattern, type Pattern } from "../runtime/pattern";

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
      { mode: 'interpreted', argPattern: Pattern, body: Expr }
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

  k.makeFunctionObj = (scopeClosure: ScopeObj, name: SymbolObj | null, argPattern: Pattern, body: Expr): FunctionObj => ({
    tag: 'FunctionObj',
    type: functionTypeObj,
    name,
    mode: 'interpreted',
    argPattern,
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
    if (fn.mode === 'native') {
      if (args.length !== fn.argCount) {
        const fnName = fn.name ? fn.name.name : '<function>';
        throw new Error(`${fnName} expects ${fn.argCount} args, got ${args.length}`);
      }
      return fn.nativeFn(args);
    }

    // Create a list from args and match against argPattern
    const argsList = k.makeListObj(args);
    const matchResult = matchPattern(fn.argPattern, argsList, k, fn.scopeClosure);

    if (!matchResult.matched) {
      const fnName = fn.name ? fn.name.name : '<function>';
      throw new Error(`Argument pattern match failed for ${fnName}`);
    }

    const callScope = scopedBindings(matchResult.bindings, fn.scopeClosure, k);

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
