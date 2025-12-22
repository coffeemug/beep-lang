import { getThisObj, type Env } from "../env";
import { nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";
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

export function registerIntMethods(env: Env) {
  const m = nativeMethod(env, 'int', 'show', 0, (method) => {
    const thisObj = getThisObj<IntObj>(method, env);
    return makeStringObj(thisObj.value.toString(), env.stringTypeObj.deref()!);
  });
  m.receiverType.methods.set(m.name, m);
}
