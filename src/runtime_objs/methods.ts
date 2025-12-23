import type { TypeObj, RuntimeObj } from ".";
import { findSymbolByName, intern_, type SymbolEnv } from "../bootstrap/symbol_env";
import type { SymbolTypeObj } from "./symbol";
import type { Frame } from "../frame";
import type { Expr } from "../parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "./string";
import type { SymbolObj } from "./symbol";

export type NativeFn = (method: MethodObj, args: RuntimeObj[]) => RuntimeObj;

export type MethodTypeObj =
  & RuntimeObjMixin<'MethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

type MethodObjBase =
  & RuntimeObjMixin<'MethodObj', MethodTypeObj>
  & {
    receiverType: TypeObj,
    name: SymbolObj,
    closureFrame: Frame,
  }

export type MethodObj = MethodObjBase & (
  | { mode: 'interpreted', argNames: SymbolObj[], body: Expr }
  | { mode: 'native', argCount: number, nativeFn: NativeFn }
)

export function makeMethodTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): MethodTypeObj {
  return {
    tag: 'MethodTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeMethodObj(receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr, methodTypeObj: MethodTypeObj, closureFrame: Frame): MethodObj {
  return {
    tag: 'MethodObj',
    type: methodTypeObj,
    receiverType,
    name,
    mode: 'interpreted',
    argNames,
    body,
    closureFrame,
  };
}

export function makeNativeMethodObj(receiverType: TypeObj, name: SymbolObj, argCount: number, nativeFn: NativeFn, methodTypeObj: MethodTypeObj, closureFrame: Frame): MethodObj {
  return {
    tag: 'MethodObj',
    type: methodTypeObj,
    receiverType,
    name,
    mode: 'native',
    argCount,
    nativeFn,
    closureFrame,
  };
}

export function nativeMethod(
  m: ModuleObj,
  env: SymbolEnv,
  receiverTypeName: string,
  name: string,
  argCount: number,
  nativeFn: NativeFn
): MethodObj {
  const receiverType = getBindingByName(receiverTypeName, m, env) as TypeObj;
  const symbolTypeObj = getBindingByName<SymbolTypeObj>('symbol', m, env)!;
  const methodTypeObj = getBindingByName<MethodTypeObj>('method', m, env)!;
  return makeNativeMethodObj(
    receiverType,
    intern_(name, env, symbolTypeObj),
    argCount,
    nativeFn,
    methodTypeObj,
    m.topFrame
  );
}

export function registerMethodMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;

  const method = nativeMethod(m, env, 'method', 'show', 0, (method) => {
    const thisObj = getThisObj<MethodObj>(method, env);
    return makeStringObj(`<method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, stringTypeObj);
  });
  method.receiverType.methods.set(method.name, method);
}

export function getThisObj<T extends RuntimeObj>(method: MethodObj, env: SymbolEnv): T {
  return method.closureFrame.bindings.get(findSymbolByName('this', env)!.id)! as T;
}
