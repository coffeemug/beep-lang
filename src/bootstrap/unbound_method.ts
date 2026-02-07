import type { TypeObj, RuntimeObj } from "../runtime_objects";
import type { ScopeObj } from "./scope";
import type { Expr } from "../parser/parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";
import type { BeepContext } from "./bootload";
import { exportBinding } from "./module";
import type { FunctionObj, NativeFn } from "./function";
import type { Pattern } from "../runtime/pattern";

export type UnboundMethodTypeObj =
  & RuntimeObjMixin<'UnboundMethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type UnboundMethodObj =
  & RuntimeObjMixin<'UnboundMethodObj', UnboundMethodTypeObj>
  & {
    receiverType: TypeObj,
    fn: FunctionObj,
  }

// NativeMethod has thisObj as first param (for method definitions)
export type NativeMethod<T extends RuntimeObj = RuntimeObj> = (thisObj: T, args: RuntimeObj[]) => RuntimeObj;

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

  // Interpreted methods - create FunctionObj with the body
  // Prepend `this` binding pattern to argPattern so callFunction can bind it uniformly
  k.makeUnboundMethodObj = (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argPattern: Pattern, body: Expr): UnboundMethodObj => {
    // argPattern is a list pattern; prepend 'this' binding to its elements
    const listPat = argPattern as { type: 'list', elements: Pattern[], spread: Pattern | null };
    const methodPattern: Pattern = {
      type: 'list',
      elements: [{ type: 'binding', sym: k.thisSymbol, scope: 'lexical' }, ...listPat.elements],
      spread: listPat.spread,
    };

    return {
      tag: 'UnboundMethodObj',
      type: unboundMethodTypeObj,
      receiverType,
      fn: k.makeFunctionObj(scopeClosure, name, methodPattern, body),
    };
  };

  k.bindMethod = (method: UnboundMethodObj, receiverInstance: RuntimeObj) => ({
    tag: 'BoundMethodObj',
    type: k.boundMethodTypeObj,
    receiverInstance,
    method,
  });

  // Native methods - wrap NativeMethod into NativeFn
  // The wrapper prepends `this` to args, so the FunctionObj stores argCount + 1
  const makeUnboundNativeMethodObj = <T extends RuntimeObj>(
    scopeClosure: ScopeObj,
    receiverType: TypeObj,
    name: SymbolObj,
    argCount: number,
    nativeMethod: NativeMethod<T>
  ): UnboundMethodObj => {
    // Wrap the method: FunctionObj's nativeFn receives [this, ...args]
    const wrappedFn: NativeFn = (allArgs) => {
      const thisObj = allArgs[0] as T;
      const args = allArgs.slice(1);
      return nativeMethod(thisObj, args);
    };

    return {
      tag: 'UnboundMethodObj',
      type: unboundMethodTypeObj,
      receiverType,
      fn: k.makeNativeFunctionObj(name, argCount + 1, wrappedFn, scopeClosure),
    };
  };

  k.makeDefMethodNative = <T extends RuntimeObj>(receiverType: TypeObj, opts?: DefNativeOpts) =>
    (name: string, argCount: number, nativeMethod: NativeMethod<T>) => {
      const {
        binding = 'instance',
        scope = k.makeScopeObj(),
      } = opts ?? {};
      const internedName = k.intern(name);
      const method = makeUnboundNativeMethodObj(scope, receiverType, internedName, argCount, nativeMethod);
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

  defMethod('show', 0, thisObj => {
    const name = thisObj.fn.name;
    return makeStringObj(`<unbound_method ${thisObj.receiverType.name.name}/${name ? name.name : '<lambda>'}>`);
  });
}
