import { getThisObj, type Env } from "../env";
import { nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";
import type { SymbolObj } from "./symbol";
import type { RuntimeObj } from ".";
import { show } from "../interpreter";

export type ListTypeObj =
  & RuntimeObjMixin<'ListTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type ListObj =
  & RuntimeObjMixin<'ListObj', ListTypeObj>
  & {
    elements: RuntimeObj[],
  }

export function makeListTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): ListTypeObj {
  return {
    tag: 'ListTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeListObj(elements: RuntimeObj[], listTypeObj: ListTypeObj): ListObj {
  return {
    tag: 'ListObj',
    type: listTypeObj,
    elements,
  };
}

export function registerListMethods(env: Env) {
  const m = nativeMethod(env, 'list', 'show', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    const elemStrs = thisObj.elements.map((e: RuntimeObj) => show(e, env));
    return makeStringObj(`[${elemStrs.join(', ')}]`, env.stringTypeObj.deref()!);
  });
  m.receiverType.methods.set(m.name, m);
}
