import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { makeListObj, makeListTypeObj, registerListMethods, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "../core_objects/unbound_method";
import { makeModuleObj, makeModuleTypeObj, type ModuleObj, type ModuleTypeObj } from "../core_objects/module";
import { defineBinding, type Scope } from "../runtime/scope";
import { makeRootTypeObj, registerRootTypeMethods, type RootTypeObj } from "../core_objects/root_type";
import { makeStringTypeObj, registerStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, registerSymbolMethods, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";
import { initSymbolEnv, intern, intern_, type SymbolEnv } from "./symbol_env";
import { makeBoundMethodTypeObj, registerBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "../core_objects/bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";

export type BeepKernel = {
  symbolEnv: SymbolEnv,
  sysModule: ModuleObj,

  // Well-known type objects
  rootTypeObj: RootTypeObj,
  symbolTypeObj: SymbolTypeObj,
  moduleTypeObj: ModuleTypeObj,
  intTypeObj: IntTypeObj,
  stringTypeObj: StringTypeObj,
  listTypeObj: ListTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  
  // Well-known symbols
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: number) => IntObj,
  makeStringObj: (value: string) => StringObj,

  makeUnboundMethodObj: (scopeClosure: Scope, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeUnboundNativeMethodObj: <T extends RuntimeObj>(scopeClosure: Scope, receiverType: TypeObj, name: SymbolObj, argCount: number, nativeFn: NativeFn<T>) => UnboundMethodObj,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  intern(name: String): SymbolObj,
}

export function createKernel(): BeepKernel {
  let kernel: Partial<BeepKernel> = {
    symbolEnv: initSymbolEnv(),
  };
  kernel.intern = (name: string) => intern(name, kernel.symbolEnv!);

  kernel = bootstrapSysModule(kernel);
  kernel = initPreludeTypes(kernel);
  initPreludeTypeMethods(kernel);

  return kernel as BeepKernel;
}

function bootstrapSysModule(k: Partial<BeepKernel>): Partial<BeepKernel> {
  /*
    Create core types ('type', 'symbol', 'module') and intern their names.
    These are created before sysModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  rootTypeObj.name = k.intern!('type');
  symbolTypeObj.name = k.intern!('symbol');

  // Now that symbolTypeObj is complete, set it on env so intern() works
  k.symbolEnv!.symbolTypeObj = symbolTypeObj;

  const moduleTypeObj = makeModuleTypeObj(
    intern('module', k.symbolEnv!), rootTypeObj) as ModuleTypeObj;

  // Create 'sys' module
  const sysModule = makeModuleObj(
    intern('sys', k.symbolEnv!),
    moduleTypeObj);

  // Bind type names in the sys module
  defineBinding(rootTypeObj.name, rootTypeObj, sysModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, sysModule.toplevelScope);
  defineBinding(moduleTypeObj.name, moduleTypeObj, sysModule.toplevelScope);

  return {
    ...k,
    sysModule,
    rootTypeObj,
    symbolTypeObj,
    moduleTypeObj,
  };
}

function initPreludeTypes(k: Partial<BeepKernel>): Partial<BeepKernel> {
  const { rootTypeObj, symbolEnv, sysModule } = k;

  // Init core types
  initInt(k as BeepKernel);
  initUnboundMethod(k as BeepKernel);
  const stringTypeObj = makeStringTypeObj(intern('string', symbolEnv!), rootTypeObj!, sysModule!);
  const listTypeObj = makeListTypeObj(intern('list', symbolEnv!), rootTypeObj!, sysModule!);
  const boundMethodTypeObj = makeBoundMethodTypeObj(intern('method', symbolEnv!), rootTypeObj!, sysModule!);

  defineBinding(listTypeObj.name, listTypeObj, sysModule!.toplevelScope);
  defineBinding(boundMethodTypeObj.name, boundMethodTypeObj, sysModule!.toplevelScope);
  defineBinding(stringTypeObj.name, stringTypeObj, sysModule!.toplevelScope);

  const typeNames = ['type', 'symbol', 'int', 'list', 'unbound_method', 'method', 'module', 'string'];

  // Native `type` method - returns the object's type. Registering
  // here because it's the same for every type.
  for (const typeName of typeNames) {
    const mType = nativeUnboundMethod(sysModule!, symbolEnv!, typeName, 'type', 0, thisObj =>
      thisObj.type);
    mType.receiverType.methods.set(mType.name, mType);
  }

  // Native `methods` method - returns a list of method names that can be called.
  for (const typeName of typeNames) {
    const mMethods = nativeUnboundMethod(sysModule!, symbolEnv!, typeName, 'methods', 0, thisObj => {
      const methods = thisObj.type.methods.values().toArray();
      return makeListObj(methods, listTypeObj);
    });
    mMethods.receiverType.methods.set(mMethods.name, mMethods);
  }

  return {
    ...k,
    stringTypeObj,
    listTypeObj,
    boundMethodTypeObj,
    thisSymbol: intern('this', symbolEnv!),
    showSymbol: intern('show', symbolEnv!),
  };
}

function initPreludeTypeMethods(k: Partial<BeepKernel>) {
  const { symbolEnv, sysModule } = k;

  initIntMethods(k as BeepKernel);
  initUnboundMethodMethods(k as BeepKernel);
  registerStringMethods(sysModule!, symbolEnv!);
  registerListMethods(sysModule!, symbolEnv!);
  registerSymbolMethods(sysModule!, symbolEnv!);
  registerBoundMethodMethods(sysModule!, symbolEnv!);
  registerRootTypeMethods(sysModule!, symbolEnv!);

}
