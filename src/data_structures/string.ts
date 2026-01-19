import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { BeepContext } from "../bootstrap/bootload";

export type StringTypeObj =
  & RuntimeObjMixin<'StringTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type StringObj =
  & RuntimeObjMixin<'StringObj', StringTypeObj>
  & {
    value: string,
  }

export function initString(k: BeepContext) {
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

export function initStringMethods(k: BeepContext) {
  const { makeStringObj, stringTypeObj, makeListObj, makeDefNative } = k;
  const defMethod = makeDefNative<StringObj>(stringTypeObj);

  defMethod('show', 0, thisObj =>
    makeStringObj(`'${thisObj.value}'`));

  defMethod('list', 0, thisObj =>
    makeListObj([...thisObj.value].map(makeStringObj)));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') return k.falseObj;
    return thisObj.value === (other as StringObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('lt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') {
      throw new Error(`lt requires a string, got ${k.show(other)}`);
    }
    return thisObj.value < (other as StringObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('lte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') {
      throw new Error(`lte requires a string, got ${k.show(other)}`);
    }
    return thisObj.value <= (other as StringObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('gt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') {
      throw new Error(`gt requires a string, got ${k.show(other)}`);
    }
    return thisObj.value > (other as StringObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('gte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'StringObj') {
      throw new Error(`gte requires a string, got ${k.show(other)}`);
    }
    return thisObj.value >= (other as StringObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('trim', 0, thisObj =>
    makeStringObj(thisObj.value.trim()));

  defMethod('triml', 0, thisObj =>
    makeStringObj(thisObj.value.trimStart()));

  defMethod('trimr', 0, thisObj =>
    makeStringObj(thisObj.value.trimEnd()));
}
