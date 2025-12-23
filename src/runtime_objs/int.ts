import type { SymbolEnv } from "../bootstrap/symbol_env";
import { getThisObj, nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { type RootTypeObj } from "./root_type"
import { makeStringObj, type StringTypeObj } from "./string";
import type { SymbolObj } from "./symbol";

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: number,
  }

export function makeIntTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): IntTypeObj {
  return {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
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

  const mShow = nativeMethod(m, env, 'int', 'show', 0, (method) => {
    const thisObj = getThisObj<IntObj>(method, env);
    return makeStringObj(thisObj.value.toString(), stringTypeObj);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);
}
