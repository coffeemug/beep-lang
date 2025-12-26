import type { RuntimeObj } from "../runtime_objects";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { defineBinding } from "../runtime/scope";
import { type RootTypeObj } from "./root_type"
import { type MethodObjBase } from "./unbound_method";
import type { BeepKernel } from "../bootstrap/kernel";

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
  };
  defineBinding(boundMethodTypeObj.name, boundMethodTypeObj, k.sysModule.toplevelScope);

  k.boundMethodTypeObj = boundMethodTypeObj;
}

export function initBoundMethodMethods(k: BeepKernel) {
  const { makeDefNative, makeStringObj, boundMethodTypeObj } = k;

  const defMethod = makeDefNative<BoundMethodObj>(k.sysModule.toplevelScope, boundMethodTypeObj);

  defMethod('show', 0, thisObj =>
    makeStringObj(`<method [${thisObj.receiverType.name.name}].${thisObj.name.name}>`));
}
