import type { SymbolEnv } from "../bootstrap/symbol_env";
import { getThisObj, nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "./string";

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

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name'> {
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
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;

  const mShow = nativeMethod(m, env, 'symbol', 'show', 0, (method) => {
    const thisObj = getThisObj<SymbolObj>(method, env);
    return makeStringObj(`${thisObj.name}:${thisObj.id}`, stringTypeObj);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);
}
