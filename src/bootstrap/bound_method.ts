import type { RuntimeObj } from "../runtime_objects";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { UnboundMethodObj } from "./unbound_method";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";

export type BoundMethodTypeObj =
  & RuntimeObjMixin<'BoundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type BoundMethodObj =
  & RuntimeObjMixin<'BoundMethodObj', BoundMethodTypeObj>
  & {
    receiverInstance: RuntimeObj,
    method: UnboundMethodObj,
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
  const { makeDefMethodNative: makeDefNative, makeStringObj, boundMethodTypeObj, scopeTypeObj } = k;

  const defMethod = makeDefNative<BoundMethodObj>(boundMethodTypeObj);

  defMethod('show', 0, thisObj => {
    const name = thisObj.method.fn.name;
    const receiverType = thisObj.method.receiverType;
    return receiverType == scopeTypeObj ?
        makeStringObj(`<fn ${name ? name.name : '<lambda>'}>`)
      : makeStringObj(`<method [${receiverType.name.name}].${name ? name.name : '<lambda>'}>`);
  });

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'BoundMethodObj') return k.falseObj;
    const otherMethod = other as BoundMethodObj;

    if (!k.isEqual(thisObj.method, other.method)) return k.falseObj;
    if (thisObj.method.receiverType !== otherMethod.method.receiverType) return k.falseObj;
    if (thisObj.receiverInstance !== otherMethod.receiverInstance) return k.falseObj;
    return k.trueObj;
  });
}
