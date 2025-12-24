import type { SymbolEnv } from "../bootstrap/symbol_env";
import { nativeUnboundMethod } from "../core_objects/unbound_method";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { getBindingByName, type ModuleObj } from "../core_objects/module";
import { type RootTypeObj } from "../core_objects/root_type"
import { makeStringObj, type StringTypeObj } from "./string";
import type { SymbolObj } from "../core_objects/symbol";

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: number,
  }

export function makeIntTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj, bindingModule: ModuleObj): IntTypeObj {
  return {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
    bindingModule,
  };
}

export function makeIntObj(value: number, intTypeObj: IntTypeObj): IntObj {
  return {
    tag: 'IntObj',
    type: intTypeObj,
    value,
  };
}

export function registerIntMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;

  const mShow = nativeUnboundMethod<IntObj>(m, env, 'int', 'show', 0, thisObj =>
    makeStringObj(thisObj.value.toString(), stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
