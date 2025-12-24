import type { TypeObj, RuntimeObj } from "../runtime_objects";
import { intern, type SymbolEnv } from "../bootstrap/symbol_env";
import type { Frame } from "../runtime/frame";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "../data_structures/string";
import type { SymbolObj } from "./symbol";
import type { BoundMethodObj, BoundMethodTypeObj } from "./bound_method";

export type UnboundMethodTypeObj =
  & RuntimeObjMixin<'UnboundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type UnboundMethodObj = MethodObjBase & {
  tag: 'UnboundMethodObj',
  type: UnboundMethodTypeObj,
};

export type MethodObjBase =
  & Omit<RuntimeObjMixin<'__dummy_tag', never>, 'tag' | 'type'>
  & Procedure
  & {
    receiverType: TypeObj,
    name: SymbolObj,
    frameClosure: Frame,
  }

type Procedure =
  | { mode: 'interpreted', argNames: SymbolObj[], body: Expr }
  | { mode: 'native', argCount: number, nativeFn: NativeFn };

export type NativeFn<T extends RuntimeObj = RuntimeObj> = (thisObj: T, args: RuntimeObj[]) => RuntimeObj;

export function makeUnboundMethodTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj, bindingModule: ModuleObj): UnboundMethodTypeObj {
  return {
    tag: 'UnboundMethodTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
    bindingModule,
  };
}

export function makeUnboundMethodObj(receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr, methodTypeObj: UnboundMethodTypeObj, closureFrame: Frame): UnboundMethodObj {
  return {
    tag: 'UnboundMethodObj',
    type: methodTypeObj,
    receiverType,
    name,
    mode: 'interpreted',
    argNames,
    body,
    frameClosure: closureFrame,
  };
}

export function makeUnboundNativeMethodObj(receiverType: TypeObj, name: SymbolObj, argCount: number, nativeFn: NativeFn, methodTypeObj: UnboundMethodTypeObj, closureFrame: Frame): UnboundMethodObj {
  return {
    tag: 'UnboundMethodObj',
    type: methodTypeObj,
    receiverType,
    name,
    mode: 'native',
    argCount,
    nativeFn,
    frameClosure: closureFrame,
  };
}

export function nativeUnboundMethod<T extends RuntimeObj>(
  m: ModuleObj,
  env: SymbolEnv,
  receiverTypeName: string,
  name: string,
  argCount: number,
  nativeFn: NativeFn<T>
): UnboundMethodObj {
  const receiverType = getBindingByName(receiverTypeName, m, env) as TypeObj;
  const methodTypeObj = getBindingByName<UnboundMethodTypeObj>('unbound_method', m, env)!;
  return makeUnboundNativeMethodObj(
    receiverType,
    intern(name, env),
    argCount,
    nativeFn as NativeFn,
    methodTypeObj,
    m.topFrame
  );
}

export function registerUnboundMethodMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;
  const boundMethodTypeObj = getBindingByName<BoundMethodTypeObj>('bound_method', m, env)!;

  const mBind = nativeUnboundMethod<UnboundMethodObj>(m, env, 'unbound_method', 'bind', 1, (thisObj, args) =>
    bindMethod(thisObj, args[0], boundMethodTypeObj));
  mBind.receiverType.methods.set(mBind.name, mBind);

  const mShow = nativeUnboundMethod<UnboundMethodObj>(m, env, 'unbound_method', 'show', 0, thisObj =>
    makeStringObj(`<unbound_method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}

export function bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj, boundMethodTypeObj: BoundMethodTypeObj): BoundMethodObj {
  return {
    ...method,
    tag: 'BoundMethodObj',
    type: boundMethodTypeObj,
    receiverInstance,
  };
}
