import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { BeepKernel } from "../bootstrap/bootload";

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
    ownMethods: new Map(),
  };
  defineBinding(stringTypeObj.name, stringTypeObj, k.kernelModule.toplevelScope);

  k.stringTypeObj = stringTypeObj;
  k.makeStringObj = (value: string): StringObj => ({
    tag: 'StringObj',
    type: stringTypeObj,
    value,
  });
}

export function initStringMethods(k: BeepKernel) {
  const { makeStringObj, makeIntObj, stringTypeObj, makeDefNative } = k;
  const defMethod = makeDefNative<StringObj>(k.kernelModule.toplevelScope, stringTypeObj);

  defMethod('show', 0, thisObj =>
    makeStringObj(`'${thisObj.value}'`));

  defMethod('len', 0, thisObj =>
    makeIntObj(BigInt([...thisObj.value].length)));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') return k.falseObj;
    return thisObj.value === (other as StringObj).value ? k.trueObj : k.falseObj;
  });
}
