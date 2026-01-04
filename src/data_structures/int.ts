import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { BeepContext } from "../bootstrap/bootload";

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: bigint,
  }

export function initInt(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const intTypeObj: IntTypeObj = {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name: intern('int'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(intTypeObj.name, intTypeObj, k.kernelModule.toplevelScope);
  
  k.intTypeObj = intTypeObj
  k.makeIntObj = (value: bigint) => ({
      tag: 'IntObj',
      type: intTypeObj,
      value,
    });
}

export function initIntMethods(k: BeepContext) {
  const { makeStringObj, makeDefNative, intTypeObj, makeIntObj } = k;

  const defMethod = makeDefNative<IntObj>(k.kernelModule.toplevelScope, intTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(thisObj.value.toString()));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') return k.falseObj;
    return thisObj.value === (other as IntObj).value ? k.trueObj : k.falseObj;
  });
}
