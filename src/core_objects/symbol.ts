import type { SymbolEnv } from "../bootstrap/symbol_env";
import { nativeUnboundMethod } from "./unbound_method";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { getBindingByName } from "../runtime/scope";
import type { ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "../data_structures/string";

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    id: number,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name' | 'bindingModule'> {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
  };
}

export function makeSymbolObj(name: string, id: number, symbolTypeObj: SymbolTypeObj): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    id,
  };
}

export function registerSymbolMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m.toplevelScope, env)!;

  const mShow = nativeUnboundMethod<SymbolObj>(m, env, 'symbol', 'show', 0, thisObj =>
    makeStringObj(`${thisObj.name}:${thisObj.id}`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
