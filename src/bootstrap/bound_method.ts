import type { RuntimeObj } from "../runtime_objects";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { UnboundMethodObj } from "./unbound_method";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";
import type { SymbolObj } from "./symbol";

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
  const { rootTypeObj, intern, bindMethod } = k;
  const boundMethodTypeObj: BoundMethodTypeObj = {
    tag: 'BoundMethodTypeObj',
    type: rootTypeObj,
    name: intern('method'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(k.kernelModule, boundMethodTypeObj.name, boundMethodTypeObj);

  k.boundMethodTypeObj = boundMethodTypeObj;

  k.callBoundMethod = (boundMethod: BoundMethodObj, args: RuntimeObj[]): RuntimeObj => {
    return k.callFunction(boundMethod.method.fn, [boundMethod.receiverInstance, ...args]);
  }

  k.callBoundMethodByName = (obj: RuntimeObj, methodName: SymbolObj, args: RuntimeObj[]): RuntimeObj => {
    const method = obj.type.methods.get(methodName);
    if (!method) {
      throw new Error(`No ${methodName.name} method on ${k.show(obj)}`);
    }
    return k.callBoundMethod(bindMethod(method, obj), args);
  }
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
