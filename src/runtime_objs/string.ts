import { getThisObj, type Env } from "../env";
import { nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";

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

export function registerStringMethods(env: Env) {
  const m = nativeMethod(env, 'string', 'show', 0, (method) => {
    const thisObj = getThisObj<StringObj>(method, env);
    return makeStringObj(`'${thisObj.value}'`, env.stringTypeObj.deref()!);
  });
  m.receiverType.methods.set(m.name, m);
}
