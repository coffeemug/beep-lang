import type { SymbolEnv } from "../bootstrap/symbol_env";
import { type IntTypeObj } from "./int";
import { nativeUnboundMethod } from "../core_objects/unbound_method";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { getBindingByName } from "../runtime/scope";
import type { ModuleObj } from "../core_objects/module";
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

export function makeStringTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj, bindingModule: ModuleObj): StringTypeObj {
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
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m.toplevelScope, env)!;
  const intTypeObj = getBindingByName<IntTypeObj>('int', m.toplevelScope, env)!;

  const mShow = nativeUnboundMethod<StringObj>(m, env, 'string', 'show', 0, thisObj =>
    makeStringObj(`'${thisObj.value}'`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);

  // TODO: len - returns number of code points
  /*
  const mLen = nativeUnboundMethod<StringObj>(m, env, 'string', 'len', 0, thisObj => {
    const codePointCount = [...thisObj.value].length;
    return makeIntObj(codePointCount, intTypeObj);
  });
  mLen.receiverType.methods.set(mLen.name, mLen);
  */
}
