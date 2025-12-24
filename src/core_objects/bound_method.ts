import type { RuntimeObj } from "../runtime_objects";
import { type SymbolEnv } from "../bootstrap/symbol_env";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { getBindingByName } from "../runtime/scope";
import type { ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { nativeUnboundMethod, type MethodObjBase, type UnboundMethodObj } from "./unbound_method";
import { makeStringObj, type StringTypeObj } from "../data_structures/string";
import type { SymbolObj } from "./symbol";

export type NativeFn<T extends RuntimeObj = RuntimeObj> = (thisObj: T, args: RuntimeObj[]) => RuntimeObj;

export type BoundMethodTypeObj =
  & RuntimeObjMixin<'BoundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type BoundMethodObj = MethodObjBase & {
  tag: 'BoundMethodObj',
  type: BoundMethodTypeObj,
  receiverInstance: RuntimeObj,
}

export function makeBoundMethodTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj, bindingModule: ModuleObj): BoundMethodTypeObj {
  return {
    tag: 'BoundMethodTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
    bindingModule,
  };
}

export function registerBoundMethodMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m.topScope, env)!;

  const mShow = nativeUnboundMethod<UnboundMethodObj>(m, env, 'method', 'show', 0, thisObj =>
    makeStringObj(`<method:${thisObj.mode} ${thisObj.receiverType.name.name}/${thisObj.name.name}>`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);

  // TODO: eventually add `funcall/apply` here.
}
