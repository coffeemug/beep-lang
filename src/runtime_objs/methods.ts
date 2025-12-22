import type { TypeObj, RuntimeObj } from ".";
import { getThisObj, type Env, type Frame } from "../env";
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

export function registerMethodMethods(env: Env) {
  const methodTypeObj = env.methodTypeObj.deref()!;
  methodTypeObj.methods.set(env.showSym, makeNativeMethodObj(
    methodTypeObj, env.showSym, 0,
    (method) => {
      const thisObj = getThisObj<MethodObj>(method, env);
      return makeStringObj(`<method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, env.stringTypeObj.deref()!);
    },
    methodTypeObj, env.currentFrame
  ));
}
