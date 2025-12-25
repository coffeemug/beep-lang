import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { defineBinding } from "../runtime/scope";
import { type RootTypeObj } from "../core_objects/root_type"
import type { BeepKernel } from "../bootstrap/kernel";

export type StringTypeObj =
  & RuntimeObjMixin<'StringTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type StringObj =
  & RuntimeObjMixin<'StringObj', StringTypeObj>
  & {
    value: string,
  }

export function initString(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const stringTypeObj: StringTypeObj = {
    tag: 'StringTypeObj',
    type: rootTypeObj,
    name: intern('string'),
    methods: new Map(),
  };
  defineBinding(stringTypeObj.name, stringTypeObj, k.sysModule.toplevelScope);

  k.stringTypeObj = stringTypeObj;
  k.makeStringObj = (value: string): StringObj => ({
    tag: 'StringObj',
    type: stringTypeObj,
    value,
  });
}

export function initStringMethods(k: BeepKernel) {
  const { makeUnboundNativeMethodObj, makeStringObj, stringTypeObj, intern,
    makeIntObj,
   } = k;
  const scope = k.sysModule.toplevelScope;

  makeUnboundNativeMethodObj<StringObj>(scope, stringTypeObj, intern('show'), 0, thisObj =>
    makeStringObj(`'${thisObj.value}'`));

  makeUnboundNativeMethodObj<StringObj>(scope, stringTypeObj, intern('len'), 0, thisObj =>
    makeIntObj([...thisObj.value].length));
}
