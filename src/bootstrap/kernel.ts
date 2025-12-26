import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { initList, initListMethods, type ListObj, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "../core_objects/unbound_method";
import { initModule, initModuleMethods, initSysModule, type ModuleTypeObj, type NamedModuleObj } from "../core_objects/module";
import { defineBinding, getBindingByName, makeScope, type Scope } from "../runtime/scope";
import { makeRootTypeObj, initRootTypeMethods, type RootTypeObj } from "../core_objects/root_type";
import { initString, initStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, initSymbolMethods, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";
import { initSymbolEnv, intern, type SymbolEnv } from "./symbol_env";
import { initBoundMethod, initBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "../core_objects/bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeInterpreter } from "../runtime/interpreter";

export type BeepKernel = {
  symbolEnv: SymbolEnv,
  sysModule: NamedModuleObj,

  activeModule: NamedModuleObj,

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
  atSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: number) => IntObj,
  makeStringObj: (value: string) => StringObj,
  makeListObj: (elements: RuntimeObj[]) => ListObj,
  intern: (name: string) => SymbolObj,

  makeNamedModuleObj: (name: SymbolObj) => NamedModuleObj,

  makeUnboundMethodObj: (scopeClosure: Scope, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeDefNative: <T extends RuntimeObj>(scopeClosure: Scope, receiverType: TypeObj) => 
    (name: string, argCount: number, nativeFn: NativeFn<T>) => UnboundMethodObj,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  // More well-known functions
  evaluate(expr: Expr, scope?: Scope): RuntimeObj,
  show: (obj: RuntimeObj) => string,
  callMethod: (method: BoundMethodObj, args: RuntimeObj[]) => RuntimeObj,
}

export function createKernel(): BeepKernel {
  let kernel: Partial<BeepKernel> = {
    symbolEnv: initSymbolEnv(),
  };

  kernel = bootstrapSysModule(kernel);
  kernel = initPreludeTypes(kernel);
  initWellKnownFunctions(kernel as BeepKernel);
  initPreludeTypeMethods(kernel as BeepKernel);

  return kernel as BeepKernel;
}

function bootstrapSysModule(k: Partial<BeepKernel>): Partial<BeepKernel> {
  /*
    Create core types ('type', 'symbol', 'module') and intern their names.
    These are created before sysModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  k.intern = (name: string) => intern(name, k.symbolEnv!, symbolTypeObj);

  rootTypeObj.name = k.intern('type');
  symbolTypeObj.name = k.intern('symbol');

  const sysModule = initSysModule(k as BeepKernel, rootTypeObj);

  // Bind type names in the sys module
  defineBinding(rootTypeObj.name, rootTypeObj, sysModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, sysModule.toplevelScope);

  return {
    ...k,
    rootTypeObj,
    symbolTypeObj,
    sysModule,
    activeModule: sysModule,
  };
}

function initPreludeTypes(k: Partial<BeepKernel>): Partial<BeepKernel> {
  // Init types that can use the standard pattern
  initInt(k as BeepKernel);
  initString(k as BeepKernel);
  initList(k as BeepKernel);
  initUnboundMethod(k as BeepKernel);
  initBoundMethod(k as BeepKernel);
  initModule(k as BeepKernel);

  // Register `type` and `methods` methods for all types
  const typeNames = [
    'type', 'symbol', 'int', 'list', 'unbound_method', 'method', 'string',
    'module',
  ];
  const scope = k.sysModule!.toplevelScope;

  for (const typeName of typeNames) {
    const receiverType = getBindingByName<TypeObj>(typeName, scope, k.symbolEnv!)!;
    const defMethod = k.makeDefNative!(scope, receiverType);
    defMethod('type', 0, thisObj => thisObj.type);
    defMethod('methods', 0, thisObj =>
      k.makeListObj!(thisObj.type.methods.values().toArray()));
  }

  return {
    ...k,
    thisSymbol: k.intern!('this'),
    showSymbol: k.intern!('show'),
    atSymbol: k.intern!('at'),
  };
}

function initPreludeTypeMethods(k: BeepKernel) {
  initIntMethods(k);
  initStringMethods(k);
  initListMethods(k);
  initUnboundMethodMethods(k);
  initBoundMethodMethods(k);
  initSymbolMethods(k);
  initRootTypeMethods(k);
  initModuleMethods(k as BeepKernel);
}

function initWellKnownFunctions(k: BeepKernel) {
  const { bindMethod, showSymbol, thisSymbol } = k;

  k.callMethod = (method: BoundMethodObj, args: RuntimeObj[]): RuntimeObj => {
    const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
    if (args.length !== expectedCount) {
      throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
    }

    if (method.mode === 'native') {
      return method.nativeFn(method.receiverInstance, args);
    }

    let callScope = makeScope(method.scopeClosure);
    defineBinding(thisSymbol, method.receiverInstance, callScope);
    for (let i = 0; i < method.argNames.length; i++) {
      defineBinding(method.argNames[i], args[i], callScope);
    }
    return k.evaluate(method.body, callScope);
  }

  k.show = (obj: RuntimeObj): string  => {
    const showMethod = obj.type.methods.get(showSymbol);
    if (!showMethod) {
      return `<${obj.tag}:noshow>`;
    }

    const boundMethod = bindMethod(showMethod, obj);
    const result = k.callMethod(boundMethod, []) as StringObj;
    return result.value;
  }

  // Has to be last as `makeInterpreter` expects `callMethod` and `show`
  // to be defined in `k`. We can fix that later.  
  k.evaluate = makeInterpreter(k).evaluate;
}
