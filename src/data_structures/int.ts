import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { defineBinding } from "../runtime/scope";
import { type RootTypeObj } from "../core_objects/root_type"
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
  const { rootTypeObj, intern } = k;
  const intTypeObj: IntTypeObj = {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name: intern('int'),
    methods: new Map(),
  };
  defineBinding(intTypeObj.name, intTypeObj, k.sysModule.toplevelScope);
  
  k.intTypeObj = intTypeObj
  k.makeIntObj = (value: number) => ({
      tag: 'IntObj',
      type: intTypeObj,
      value,
    });
}

export function initIntMethods(k: BeepKernel) {
  const { makeStringObj, makeDefNative, intTypeObj } = k;

  const defMethod = makeDefNative<IntObj>(k.sysModule.toplevelScope, intTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(thisObj.value.toString()));
}
