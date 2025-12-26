import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { initList, initListMethods, type ListObj, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "./unbound_method";
import { initModule, initModuleMethods, initKernelModule, type ModuleTypeObj, type ModuleObj } from "./module";
import { defineBinding, getBindingByName, initScope, initScopeMethods, type ScopeObj, type ScopeTypeObj } from "./scope";
import { makeRootTypeObj, initRootTypeMethods, type RootTypeObj } from "./root_type";
import { initString, initStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, initSymbolMethods, type SymbolObj, type SymbolTypeObj } from "./symbol";
import { initSymbolEnv, intern, type SymbolEnv } from "./symbol_env";
import { initBoundMethod, initBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "./bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeInterpreter } from "../runtime/interpreter";

export type BeepKernel = {
  symbolEnv: SymbolEnv,
  kernelModule: ModuleObj,

  // Well-known type objects
  rootTypeObj: RootTypeObj,
  symbolTypeObj: SymbolTypeObj,
  moduleTypeObj: ModuleTypeObj,
  intTypeObj: IntTypeObj,
  stringTypeObj: StringTypeObj,
  listTypeObj: ListTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  scopeTypeObj: ScopeTypeObj,

  // Well-known symbols
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,
  atSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: number) => IntObj,
  makeStringObj: (value: string) => StringObj,
  makeListObj: (elements: RuntimeObj[]) => ListObj,
  makeScopeObj: (parent?: ScopeObj) => ScopeObj,
  intern: (name: string) => SymbolObj,

  makeModuleObj: (name: SymbolObj) => ModuleObj,

  makeUnboundMethodObj: (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeDefNative: <T extends RuntimeObj>(scopeClosure: ScopeObj, receiverType: TypeObj) =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => UnboundMethodObj,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  // More well-known functions
  evaluate(expr: Expr, scope: ScopeObj): RuntimeObj,
  show: (obj: RuntimeObj) => string,
  callMethod: (method: BoundMethodObj, args: RuntimeObj[]) => RuntimeObj,
}

export function createKernel(): BeepKernel {
  let kernel: Partial<BeepKernel> = {
    symbolEnv: initSymbolEnv(),
  };

  kernel = bootstrapKernelModule(kernel);
  kernel = initPreludeTypes(kernel);
  initWellKnownFunctions(kernel as BeepKernel);
  initPreludeTypeMethods(kernel as BeepKernel);

  return kernel as BeepKernel;
}

function bootstrapKernelModule(k: Partial<BeepKernel>): Partial<BeepKernel> {
  /*
    Create core types ('type', 'symbol', 'module', 'scope') and intern their names.
    These are created before kernelModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  k.intern = (name: string) => intern(name, k.symbolEnv!, symbolTypeObj);

  rootTypeObj.name = k.intern('type');
  symbolTypeObj.name = k.intern('symbol');

  // Create scopeTypeObj early so we can create scopes during bootstrap
  const scopeTypeObj: ScopeTypeObj = {
    tag: 'ScopeTypeObj',
    type: rootTypeObj,
    name: k.intern('scope'),
    methods: new Map(),
  };
  k.scopeTypeObj = scopeTypeObj;

  const kernelModule = initKernelModule(k as BeepKernel, rootTypeObj, scopeTypeObj);

  // Bind type names in the kernel module
  defineBinding(rootTypeObj.name, rootTypeObj, kernelModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, kernelModule.toplevelScope);

  return {
    ...k,
    rootTypeObj,
    symbolTypeObj,
    scopeTypeObj,
    kernelModule,
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
  initScope(k as BeepKernel);

  // Register `type` and `methods` methods for all types
  const typeNames = [
    'type', 'symbol', 'int', 'list', 'unbound_method', 'method', 'string',
    'module', 'scope',
  ];
  const scope = k.kernelModule!.toplevelScope;

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
  initScopeMethods(k);
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

    let callScope = k.makeScopeObj(method.scopeClosure);
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
