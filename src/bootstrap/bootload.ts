import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { initList, initListMethods, type ListObj, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "./unbound_method";
import { initModule, initModuleMethods, initKernelModule, type ModuleTypeObj, type ModuleObj } from "./module";
import { defineBinding, getBindingByName, initScope, initScopeMethods, makeScopeTypeObj, type ScopeObj, type ScopeTypeObj } from "./scope";
import { makeRootTypeObj, initRootTypeMethods, type RootTypeObj } from "./root_type";
import { initString, initStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, initSymbolMethods, type SymbolObj, type SymbolTypeObj } from "./symbol";
import { makeSymbolSpaceTypeObj, makeSymbolSpaceObj, intern, initSymbolSpaceMethods, type SymbolSpaceObj, type SymbolSpaceTypeObj } from "./symbol_space";
import { initBoundMethod, initBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "./bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeInterpreter, type EvalResult } from "../runtime/interpreter";
import { initMap, initMapMethods, type MapObj, type MapTypeObj } from "../data_structures/map";
import { initStruct, initStructMethods, type StructTypeObj, type NamedStructTypeObj, type NamedStructObj } from "../data_structures/struct";

export type BeepKernel = {
  symbolSpaceObj: SymbolSpaceObj,
  kernelModule: ModuleObj,
  dynamicScope: ScopeObj,

  // Well-known type objects
  rootTypeObj: RootTypeObj,
  symbolTypeObj: SymbolTypeObj,
  symbolSpaceTypeObj: SymbolSpaceTypeObj,
  moduleTypeObj: ModuleTypeObj,
  intTypeObj: IntTypeObj,
  stringTypeObj: StringTypeObj,
  listTypeObj: ListTypeObj,
  mapTypeObj: MapTypeObj,
  structTypeObj: StructTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  scopeTypeObj: ScopeTypeObj,

  // Well-known symbols
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,
  atSymbol: SymbolObj,
  getFieldSymbol: SymbolObj,
  modulesSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: bigint) => IntObj,
  makeStringObj: (value: string) => StringObj,
  makeListObj: (elements: RuntimeObj[]) => ListObj,
  makeMapObj: (pairs: [SymbolObj, RuntimeObj][]) => MapObj,
  makeScopeObj: (parent?: ScopeObj) => ScopeObj,
  intern: (name: string) => SymbolObj,

  makeModuleObj: (name: SymbolObj) => ModuleObj,

  defineNamedStruct: (name: SymbolObj, fields: SymbolObj[]) => NamedStructTypeObj,
  instantiateNamedStruct: (namedStructTypeObj: NamedStructTypeObj, fields: RuntimeObj[]) => NamedStructObj,

  makeUnboundMethodObj: (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeDefNative: <T extends RuntimeObj>(scopeClosure: ScopeObj, receiverType: TypeObj, binding?: 'instance' | 'own') =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => void,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  // More well-known functions
  evaluate(expr: Expr, scope: ScopeObj): EvalResult,
  show: (obj: RuntimeObj) => string,
  callMethod: (method: BoundMethodObj, args: RuntimeObj[]) => RuntimeObj,
}

export function createKernel(): BeepKernel {
  const kernel: Partial<BeepKernel> = {};

  bootstrapKernelModule(kernel);
  initPreludeTypes(kernel);
  initWellKnownFunctions(kernel as BeepKernel);
  initPreludeTypeMethods(kernel as BeepKernel);
  initDynamicScope(kernel as BeepKernel);

  return kernel as BeepKernel;
}

function bootstrapKernelModule(k: Partial<BeepKernel>) {
  /*
    Create core types ('type', 'symbol', 'symbol_space', 'module', 'scope') and intern their names.
    These are created before kernelModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolSpaceTypeObj = makeSymbolSpaceTypeObj(rootTypeObj);
  const symbolSpace = makeSymbolSpaceObj(symbolSpaceTypeObj);
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  k.symbolSpaceObj = symbolSpace;
  k.symbolSpaceTypeObj = symbolSpaceTypeObj;
  k.intern = (name: string) => intern(name, k.symbolSpaceObj!, symbolTypeObj);

  rootTypeObj.name = k.intern('type');
  symbolTypeObj.name = k.intern('symbol');
  symbolSpaceTypeObj.name = k.intern('symbol_space');

  // Assign rootTypeObj before creating scopeTypeObj (which needs it)
  k.rootTypeObj = rootTypeObj;

  // Create scopeTypeObj early so we can create scopes during bootstrap
  k.scopeTypeObj = makeScopeTypeObj(k as BeepKernel);
  const kernelModule = initKernelModule(k as BeepKernel, rootTypeObj, k.scopeTypeObj);

  // Bind type names in the kernel module
  defineBinding(rootTypeObj.name, rootTypeObj, kernelModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, kernelModule.toplevelScope);
  defineBinding(symbolSpaceTypeObj.name, symbolSpaceTypeObj, kernelModule.toplevelScope);

  k.symbolTypeObj = symbolTypeObj;
  k.kernelModule = kernelModule;
}

function initPreludeTypes(k: Partial<BeepKernel>) {
  // Init types that can use the standard pattern
  initInt(k as BeepKernel);
  initString(k as BeepKernel);
  initList(k as BeepKernel);
  initMap(k as BeepKernel);
  initUnboundMethod(k as BeepKernel);
  initBoundMethod(k as BeepKernel);
  initModule(k as BeepKernel);
  initScope(k as BeepKernel);
  initStruct(k as BeepKernel);

  k.thisSymbol = k.intern!('this');
  k.showSymbol = k.intern!('show');
  k.atSymbol = k.intern!('at');
  k.modulesSymbol = k.intern!('modules');
  k.getFieldSymbol = k.intern!('get_field');
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
    return k.evaluate(method.body, callScope).value;
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

export function registerDefaultMethods(k: BeepKernel, receiverType: TypeObj) {
  const scope = k.kernelModule!.toplevelScope;
  const defMethod = k.makeDefNative!(scope, receiverType);
  defMethod('type', 0, thisObj => thisObj.type);
  defMethod('methods', 0, thisObj =>
    k.makeListObj!(thisObj.type.methods.values().toArray()));
  defMethod('get_field', 1, (thisObj, args) => {
    const fieldName = args[0] as SymbolObj;

    const field = thisObj.type.methods.get(fieldName);
    if (field) {
      return k.bindMethod!(field, thisObj);
    }

    if ("ownMethods" in thisObj) {
      thisObj = thisObj as TypeObj;
      const ownField = thisObj.ownMethods.get(fieldName);
      if (ownField) {
        return ownField;
      }
    }

    throw new Error(`No field ${fieldName.name} on ${k.show!(thisObj.type)}`);
  });
}

function initPreludeTypeMethods(k: BeepKernel) {
  // Register `type` and `methods` methods for all types
  const typeNames = [
    'type', 'symbol', 'symbol_space', 'int', 'list', 'unbound_method', 'method', 'string',
    'module', 'scope', 'map', 'structure',
  ];
  const scope = k.kernelModule!.toplevelScope;

  for (const typeName of typeNames) {
    const receiverType = getBindingByName<TypeObj>(typeName, scope, k.symbolSpaceObj)!;
    registerDefaultMethods(k, receiverType);
  }

  initIntMethods(k);
  initStringMethods(k);
  initListMethods(k);
  initMapMethods(k);
  initUnboundMethodMethods(k);
  initBoundMethodMethods(k);
  initSymbolMethods(k);
  initSymbolSpaceMethods(k);
  initRootTypeMethods(k);
  initModuleMethods(k as BeepKernel);
  initScopeMethods(k);
  initStructMethods(k);
}

function initDynamicScope(k: BeepKernel) {
  k.dynamicScope = k.makeScopeObj();
  defineBinding(k.modulesSymbol, k.makeMapObj([
    [k.intern("kernel"), k.kernelModule],
  ]), k.dynamicScope);

  defineBinding(k.intern("symbols"), k.symbolSpaceObj, k.dynamicScope);
}
