import type { SymbolEnv } from "../bootstrap/symbol_env";
import { makeIntObj, type IntTypeObj } from "./int";
import { getThisObj, nativeMethod } from "../core_objects/methods";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { getBindingByName, type ModuleObj } from "../core_objects/module";
import { type RootTypeObj } from "../core_objects/root_type"
import type { SymbolObj } from "../core_objects/symbol";

export type StringTypeObj =
  & RuntimeObjMixin<'StringTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type StringObj =
  & RuntimeObjMixin<'StringObj', StringTypeObj>
  & {
    value: string,
  }

export function makeStringTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): StringTypeObj {
  return {
    tag: 'StringTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeStringObj(value: string, stringTypeObj: StringTypeObj): StringObj {
  return {
    tag: 'StringObj',
    type: stringTypeObj,
    value,
  };
}

export function registerStringMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;
  const intTypeObj = getBindingByName<IntTypeObj>('int', m, env)!;

  const mShow = nativeMethod(m, env, 'string', 'show', 0, (method) => {
    const thisObj = getThisObj<StringObj>(method, env);
    return makeStringObj(`'${thisObj.value}'`, stringTypeObj);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);

  // len - returns number of code points
  const mLen = nativeMethod(m, env, 'string', 'len', 0, (method) => {
    const thisObj = getThisObj<StringObj>(method, env);
    const codePointCount = [...thisObj.value].length;
    return makeIntObj(codePointCount, intTypeObj);
  });
  mLen.receiverType.methods.set(mLen.name, mLen);
}
