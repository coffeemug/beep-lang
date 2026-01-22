import type { RuntimeObj } from "../runtime_objects";
import type { ScopeObj } from "./scope";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";

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
}

export function initFunctionMethods(k: BeepContext) {
  const { makeStringObj, functionTypeObj, makeDefNative } = k;
  const defMethod = makeDefNative<FunctionObj>(functionTypeObj);

  defMethod('show', 0, thisObj =>
    makeStringObj(thisObj.name ? `<function ${thisObj.name.name}>` : '<lambda>'));
}
