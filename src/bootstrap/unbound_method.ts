import type { TypeObj, RuntimeObj } from "../runtime_objects";
import type { ScopeObj } from "./scope";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";

export type UnboundMethodTypeObj =
  & RuntimeObjMixin<'UnboundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type UnboundMethodObj = MethodObjBase & {
  tag: 'UnboundMethodObj',
  type: UnboundMethodTypeObj,
};

export type MethodObjBase =
  & Omit<RuntimeObjMixin<'__dummy_tag', never>, 'tag' | 'type'>
  & Procedure
  & {
    receiverType: TypeObj,
    name: SymbolObj,
    scopeClosure: ScopeObj,
  }

type Procedure =
  | { mode: 'interpreted', argNames: SymbolObj[], body: Expr }
  | { mode: 'native', argCount: number, nativeFn: NativeFn };

export type NativeFn<T extends RuntimeObj = RuntimeObj> = (thisObj: T, args: RuntimeObj[]) => RuntimeObj;

export type DefNativeOpts = {
  binding?: 'instance' | 'own',
  scope?: ScopeObj,
}

export function initUnboundMethod(k: BeepContext) {
  const { rootTypeObj, kernelModule, intern } = k;

  const unboundMethodTypeObj: UnboundMethodTypeObj = {
    tag: 'UnboundMethodTypeObj',
    type: rootTypeObj,
    name: intern('unbound_method'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(kernelModule, unboundMethodTypeObj.name, unboundMethodTypeObj);
  k.unboundMethodTypeObj = unboundMethodTypeObj;

  k.makeUnboundMethodObj = (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr): UnboundMethodObj => {
    const unboundMethod: UnboundMethodObj = {
      tag: 'UnboundMethodObj',
      type: unboundMethodTypeObj,
      receiverType,
      name,
      mode: 'interpreted',
      argNames,
      body,
      scopeClosure,
    }
    return unboundMethod;
  };

  k.bindMethod = (method: UnboundMethodObj, receiverInstance: RuntimeObj) => ({
    ...method,
    tag: 'BoundMethodObj',
    type: k.boundMethodTypeObj,
    receiverInstance,
  });

  const makeUnboundNativeMethodObj = <T extends RuntimeObj>(scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argCount: number, nativeFn: NativeFn<T>): UnboundMethodObj => {
    const unboundMethod: UnboundMethodObj = {
      tag: 'UnboundMethodObj',
      type: unboundMethodTypeObj,
      receiverType,
      name,
      mode: 'native',
      argCount,
      nativeFn: nativeFn as NativeFn,
      scopeClosure,
    };
    return unboundMethod;
  };

  k.makeDefMethodNative = <T extends RuntimeObj>(receiverType: TypeObj, opts?: DefNativeOpts) =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => {
      const {
        binding = 'instance',
        scope = k.makeScopeObj(),
      } = opts ?? {};
      const internedName = k.intern(name);
      const method = makeUnboundNativeMethodObj(scope, receiverType, internedName, argCount, nativeFn);
      if (binding == 'instance') {
        receiverType.methods.set(internedName, method);
        return method;
      } else {
        const boundMethod = k.bindMethod(method, receiverType);
        receiverType.ownMethods.set(internedName, boundMethod);
        return boundMethod;
      }
    }
}

export function initUnboundMethodMethods(k: BeepContext) {
  const {
    bindMethod, makeStringObj, unboundMethodTypeObj, makeDefMethodNative: makeDefNative,
   } = k;
  const defMethod = makeDefNative<UnboundMethodObj>(unboundMethodTypeObj);

  defMethod('bind', 1, (thisObj, args) =>
    bindMethod(thisObj, args[0]));

  defMethod('show', 0, thisObj =>
    makeStringObj(`<unbound_method ${thisObj.receiverType.name.name}/${thisObj.name.name}>`));
}
