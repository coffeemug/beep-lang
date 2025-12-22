import type { TypeObj, RuntimeObj } from ".";
import { findBinding, getThisObj, intern, type Env, type Frame } from "../env";
import type { Expr } from "../parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";
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
  env: Env,
  receiverTypeName: string,
  name: string,
  argCount: number,
  nativeFn: NativeFn
): MethodObj {
  const receiverType = findBinding(env, intern(env, receiverTypeName)) as TypeObj;
  return makeNativeMethodObj(
    receiverType,
    intern(env, name),
    argCount,
    nativeFn,
    env.methodTypeObj.deref()!,
    env.currentFrame
  );
}

export function registerMethodMethods(env: Env) {
  const m = nativeMethod(env, 'method', 'show', 0, (method) => {
    const thisObj = getThisObj<MethodObj>(method, env);
    return makeStringObj(`<method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, env.stringTypeObj.deref()!);
  });
  m.receiverType.methods.set(m.name, m);
}
