import type { TypeObj, RuntimeObj } from "../runtime_objects";
import { intern, type SymbolEnv } from "../bootstrap/symbol_env";
import type { Frame } from "../runtime/frame";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "../data_structures/string";
import type { SymbolObj } from "./symbol";

export type NativeFn<T extends RuntimeObj = RuntimeObj> = (thisObj: T, args: RuntimeObj[], method: MethodObj) => RuntimeObj;

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

export function makeMethodTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj, bindingModule: ModuleObj): MethodTypeObj {
  return {
    tag: 'MethodTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
    bindingModule,
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

export function nativeMethod<T extends RuntimeObj>(
  m: ModuleObj,
  env: SymbolEnv,
  receiverTypeName: string,
  name: string,
  argCount: number,
  nativeFn: NativeFn<T>
): MethodObj {
  const receiverType = getBindingByName(receiverTypeName, m, env) as TypeObj;
  const methodTypeObj = getBindingByName<MethodTypeObj>('method', m, env)!;
  return makeNativeMethodObj(
    receiverType,
    intern(name, env),
    argCount,
    nativeFn as NativeFn,
    methodTypeObj,
    m.topFrame
  );
}

export function registerMethodMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;

  const mShow = nativeMethod<MethodObj>(m, env, 'method', 'show', 0, thisObj =>
    makeStringObj(`<method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
