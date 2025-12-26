import type { TypeObj, RuntimeObj } from "../runtime_objects";
import type { ScopeObj } from "../runtime/scope";
import type { Expr } from "../runtime/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { defineBinding } from "../runtime/scope";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepKernel } from "../bootstrap/kernel";

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

export function initUnboundMethod(k: BeepKernel) {
  const { rootTypeObj, sysModule, intern } = k;
  
  const unboundMethodTypeObj: UnboundMethodTypeObj = {
    tag: 'UnboundMethodTypeObj',
    type: rootTypeObj,
    name: intern('unbound_method'),
    methods: new Map(),
  };
  defineBinding(unboundMethodTypeObj.name, unboundMethodTypeObj, sysModule.toplevelScope);
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

  k.makeDefNative = <T extends RuntimeObj>(scopeClosure: ScopeObj, receiverType: TypeObj) =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => {
      const internedName = k.intern(name);
      const method = makeUnboundNativeMethodObj(scopeClosure, receiverType, internedName, argCount, nativeFn);
      receiverType.methods.set(internedName, method);
      return method;
    }
}

export function initUnboundMethodMethods(k: BeepKernel) {
  const {
    bindMethod, makeStringObj, unboundMethodTypeObj, makeDefNative,
   } = k;
  const defMethod = makeDefNative<UnboundMethodObj>(k.sysModule.toplevelScope, unboundMethodTypeObj);

  defMethod('bind', 1, (thisObj, args) =>
    bindMethod(thisObj, args[0]));

  defMethod('show', 0, thisObj =>
    makeStringObj(`<unbound_method ${thisObj.receiverType.name.name}/${thisObj.name.name}>`));
}
