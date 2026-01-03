import type { RuntimeObj } from "../runtime_objects";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { defineBinding } from "./scope";
import { type RootTypeObj } from "./root_type"
import { type MethodObjBase } from "./unbound_method";
import type { BeepKernel } from "./bootload";

export type BoundMethodTypeObj =
  & RuntimeObjMixin<'BoundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type BoundMethodObj = MethodObjBase & {
  tag: 'BoundMethodObj',
  type: BoundMethodTypeObj,
  receiverInstance: RuntimeObj,
}

export function initBoundMethod(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const boundMethodTypeObj: BoundMethodTypeObj = {
    tag: 'BoundMethodTypeObj',
    type: rootTypeObj,
    name: intern('method'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(boundMethodTypeObj.name, boundMethodTypeObj, k.kernelModule.toplevelScope);

  k.boundMethodTypeObj = boundMethodTypeObj;
}

export function initBoundMethodMethods(k: BeepKernel) {
  const { makeDefNative, makeStringObj, makeIntObj, boundMethodTypeObj, scopeTypeObj } = k;

  const defMethod = makeDefNative<BoundMethodObj>(k.kernelModule.toplevelScope, boundMethodTypeObj);

  defMethod('show', 0, thisObj =>
    thisObj.receiverType == scopeTypeObj ?
        makeStringObj(`<fn ${thisObj.name.name}>`)
      : makeStringObj(`<method [${thisObj.receiverType.name.name}].${thisObj.name.name}>`));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'BoundMethodObj') return makeIntObj(0n);
    const otherMethod = other as BoundMethodObj;
    // Same method (by name and receiver type) and equal receiver instances
    if (thisObj.name !== otherMethod.name) return makeIntObj(0n);
    if (thisObj.receiverType !== otherMethod.receiverType) return makeIntObj(0n);
    if (thisObj.receiverInstance !== otherMethod.receiverInstance) return makeIntObj(0n);
    return makeIntObj(1n);
  });
}
