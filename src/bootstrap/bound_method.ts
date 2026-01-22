import type { RuntimeObj } from "../runtime_objects";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import { type MethodObjBase } from "./unbound_method";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";

export type BoundMethodTypeObj =
  & RuntimeObjMixin<'BoundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type BoundMethodObj = MethodObjBase & {
  tag: 'BoundMethodObj',
  type: BoundMethodTypeObj,
  receiverInstance: RuntimeObj,
}

export function initBoundMethod(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const boundMethodTypeObj: BoundMethodTypeObj = {
    tag: 'BoundMethodTypeObj',
    type: rootTypeObj,
    name: intern('method'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(k.kernelModule, boundMethodTypeObj.name, boundMethodTypeObj);

  k.boundMethodTypeObj = boundMethodTypeObj;
}

export function initBoundMethodMethods(k: BeepContext) {
  const { makeDefNative, makeStringObj, boundMethodTypeObj, scopeTypeObj } = k;

  const defMethod = makeDefNative<BoundMethodObj>(boundMethodTypeObj);

  defMethod('show', 0, thisObj =>
    thisObj.receiverType == scopeTypeObj ?
        makeStringObj(`<fn ${thisObj.name.name}>`)
      : makeStringObj(`<method [${thisObj.receiverType.name.name}].${thisObj.name.name}>`));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'BoundMethodObj') return k.falseObj;
    const otherMethod = other as BoundMethodObj;
    // Same method (by name and receiver type) and equal receiver instances
    if (thisObj.name !== otherMethod.name) return k.falseObj;
    if (thisObj.receiverType !== otherMethod.receiverType) return k.falseObj;
    if (thisObj.receiverInstance !== otherMethod.receiverInstance) return k.falseObj;
    return k.trueObj;
  });
}
