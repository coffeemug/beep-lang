import { intern } from "../bootstrap/symbol_env";
import { nativeUnboundMethod } from "../core_objects/unbound_method";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { defineBinding } from "../runtime/scope";
import { type RootTypeObj } from "../core_objects/root_type"
import { makeStringObj } from "./string";
import type { BeepKernel } from "../bootstrap/kernel";

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: number,
  }

export function initInt(k: BeepKernel) {
  const { rootTypeObj } = k;
  const intTypeObj: IntTypeObj = {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name: intern('int', k.symbolEnv),
    methods: new Map(),
  };
  defineBinding(intTypeObj.name, intTypeObj, k.sysModule.toplevelScope);

  function makeIntObj(value: number): IntObj {
    return {
      tag: 'IntObj',
      type: intTypeObj,
      value,
    }
  }

  return { intTypeObj, makeIntObj };
}

export function initIntMethods(k: BeepKernel) {
  const mShow = nativeUnboundMethod<IntObj>(k.sysModule, k.symbolEnv, 'int', 'show', 0, thisObj =>
    makeStringObj(thisObj.value.toString(), k.stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
