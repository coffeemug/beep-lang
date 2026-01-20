import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { exportBinding } from "../bootstrap/module";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { BeepContext } from "../bootstrap/bootload";
import type { StringObj } from "./string";

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
  exportBinding(k.kernelModule, intTypeObj.name, intTypeObj);
  
  k.intTypeObj = intTypeObj
  k.makeIntObj = (value: bigint) => ({
      tag: 'IntObj',
      type: intTypeObj,
      value,
    });
}

export function initIntMethods(k: BeepContext) {
  const { makeStringObj, makeDefNative, intTypeObj, makeIntObj } = k;

  const defMethod = makeDefNative<IntObj>(intTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(thisObj.value.toString()));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') return k.falseObj;
    return thisObj.value === (other as IntObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('mod', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`mod requires an integer, got ${k.show(other)}`);
    }
    return makeIntObj(floormod(thisObj.value, other.value));
  });

  defMethod('add', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`add requires an integer, got ${k.show(other)}`);
    }
    return makeIntObj(thisObj.value + (other as IntObj).value);
  });

  defMethod('sub', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`sub requires an integer, got ${k.show(other)}`);
    }
    return makeIntObj(thisObj.value - (other as IntObj).value);
  });

  defMethod('mul', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`mul requires an integer, got ${k.show(other)}`);
    }
    return makeIntObj(thisObj.value * (other as IntObj).value);
  });

  defMethod('floordiv', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`floordiv requires an integer, got ${k.show(other)}`);
    }
    return makeIntObj(floordiv(thisObj.value, other.value));
  });

  defMethod('lt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`lt requires an integer, got ${k.show(other)}`);
    }
    return thisObj.value < (other as IntObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('lte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`lte requires an integer, got ${k.show(other)}`);
    }
    return thisObj.value <= (other as IntObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('gt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`gt requires an integer, got ${k.show(other)}`);
    }
    return thisObj.value > (other as IntObj).value ? k.trueObj : k.falseObj;
  });

  defMethod('gte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'IntObj') {
      throw new Error(`gte requires an integer, got ${k.show(other)}`);
    }
    return thisObj.value >= (other as IntObj).value ? k.trueObj : k.falseObj;
  });

  const defOwnMethod = makeDefNative<IntTypeObj>(intTypeObj, { binding: 'own' });

  defOwnMethod('from', 1, (_thisObj, args) => {
    if (args[0].tag !== 'StringObj') {
      throw new Error(`int.from requires a string, got ${k.show(args[0])}`);
    }
    const str = (args[0] as StringObj).value;
    return makeIntObj(BigInt(str));
  });
}

function floormod(a: bigint, b: bigint): bigint {
    const r = a % b;
    if (r !== 0n && (a < 0n) !== (b < 0n)) {
        return r + b;
    }
    return r;
}

function floordiv(a: bigint, b: bigint): bigint {
    const q = a / b;
    const r = a % b;
    if (r !== 0n && (a < 0n) !== (b < 0n)) {
        return q - 1n;
    }
    return q;
}
