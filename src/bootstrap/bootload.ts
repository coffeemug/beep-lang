import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { initList, initListMethods, type ListObj, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type DefNativeOpts, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "./unbound_method";
import { initModule, initModuleMethods, initKernelModule, type ModuleTypeObj, type ModuleObj, exportBinding, getExportByName } from "./module";
import { addBinding, getBindingByName, initScope, initScopeMethods, makeScopeTypeObj, type ScopeObj, type ScopeTypeObj } from "./scope";
import { makeRootTypeObj, initRootTypeMethods, type RootTypeObj } from "./root_type";
import { initString, initStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, initSymbolMethods, type SymbolObj, type SymbolTypeObj } from "./symbol";
import { makeSymbolSpaceTypeObj, makeSymbolSpaceObj, intern, initSymbolSpaceMethods, type SymbolSpaceObj, type SymbolSpaceTypeObj } from "./symbol_space";
import { initBoundMethod, initBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "./bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeInterpreter, type EvalResult, ReturnSignal } from "../runtime/interpreter";
import { initMap, initMapMethods, type MapObj, type MapTypeObj } from "../data_structures/map";
import { initStruct, initStructMethods, type StructTypeObj, type NamedStructTypeObj, type NamedStructObj } from "../data_structures/struct";
import { initRange, initRangeMethods, type RangeObj, type RangeTypeObj } from "../data_structures/range";
import { initPrototype, initPrototypeMethods, type PrototypeTypeObj, type NamedPrototypeTypeObj } from "../runtime/prototype";
import { initIO } from "../stdlib_native/io";

export type BeepContext = {
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
  prototypeTypeObj: PrototypeTypeObj,
  rangeTypeObj: RangeTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  scopeTypeObj: ScopeTypeObj,

  // Other well-known objects
  trueObj: RuntimeObj,
  falseObj: RuntimeObj,
  unitObj: RuntimeObj,

  // Well-known symbols
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,
  modulesSymbol: SymbolObj,
  moduleSymbol: SymbolObj,
  listSymbol: SymbolObj,

  getFieldSymbol: SymbolObj,
  setFieldSymbol: SymbolObj,
  getItemSymbol: SymbolObj,
  setItemSymbol: SymbolObj,

  addSymbol: SymbolObj,
  subSymbol: SymbolObj,
  mulSymbol: SymbolObj,
  floordivSymbol: SymbolObj,
  modSymbol: SymbolObj,

  eqSymbol: SymbolObj,
  ltSymbol: SymbolObj,
  lteSymbol: SymbolObj,
  gtSymbol: SymbolObj,
  gteSymbol: SymbolObj,

  makeIterSymbol: SymbolObj,
  nextSymbol: SymbolObj,
  okSymbol: SymbolObj,
  doneSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: bigint) => IntObj,
  makeStringObj: (value: string) => StringObj,
  makeListObj: (elements: RuntimeObj[]) => ListObj,
  makeMapObj: (pairs: [SymbolObj, RuntimeObj][]) => MapObj,
  makeRangeObj: (start: bigint, end: bigint, mode: 'exclusive' | 'inclusive') => RangeObj,
  makeScopeObj: (parent?: ScopeObj) => ScopeObj,
  intern: (name: string) => SymbolObj,

  makeModuleObj: (name: SymbolObj) => ModuleObj,

  defineNamedStruct: (name: SymbolObj, fields: SymbolObj[]) => NamedStructTypeObj,
  instantiateNamedStruct: (namedStructTypeObj: NamedStructTypeObj, fields: RuntimeObj[]) => NamedStructObj,
  defineNamedPrototype: (name: SymbolObj) => NamedPrototypeTypeObj,

  makeUnboundMethodObj: (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeDefNative: <T extends RuntimeObj>(receiverType: TypeObj, opts?: DefNativeOpts) =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => BoundMethodObj | UnboundMethodObj,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  // More well-known functions
  evaluate(expr: Expr, scope: ScopeObj): EvalResult,
  loadModule: (filepath: string, force?: boolean) => ModuleObj,
  show: (obj: RuntimeObj) => string,
  callBoundMethod: (method: BoundMethodObj, args: RuntimeObj[]) => RuntimeObj,
  callMethod: (obj: RuntimeObj, methodName: SymbolObj, args: RuntimeObj[]) => RuntimeObj,
  isEqual: (a: RuntimeObj, b: RuntimeObj) => boolean,
}

export function makeBeepContext(): BeepContext {
  const ctx: Partial<BeepContext> = {};

  bootstrapKernelModule(ctx);
  initPreludeTypes(ctx);
  initWellKnownFunctions(ctx as BeepContext);
  initPreludeTypeMethods(ctx as BeepContext);
  initPrelude(ctx as BeepContext);
  initDynamicScope(ctx as BeepContext);
  importNativeStdlib(ctx as BeepContext);
  importStdlib(ctx as BeepContext);

  return ctx as BeepContext;
}

function bootstrapKernelModule(k: Partial<BeepContext>) {
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
  k.scopeTypeObj = makeScopeTypeObj(k as BeepContext);
  const kernelModule = initKernelModule(k as BeepContext, rootTypeObj, k.scopeTypeObj);

  // Bind type names in the kernel module
  exportBinding(kernelModule, rootTypeObj.name, rootTypeObj);
  exportBinding(kernelModule, symbolTypeObj.name, symbolTypeObj);
  exportBinding(kernelModule, symbolSpaceTypeObj.name, symbolSpaceTypeObj);

  k.symbolTypeObj = symbolTypeObj;
  k.kernelModule = kernelModule;
}

function initPreludeTypes(k: Partial<BeepContext>) {
  // Init types that can use the standard pattern
  initInt(k as BeepContext);
  initString(k as BeepContext);
  initList(k as BeepContext);
  initMap(k as BeepContext);
  initRange(k as BeepContext);
  initUnboundMethod(k as BeepContext);
  initBoundMethod(k as BeepContext);
  initModule(k as BeepContext);
  initScope(k as BeepContext);
  initStruct(k as BeepContext);
  initPrototype(k as BeepContext);

  k.thisSymbol = k.intern!('this');
  k.showSymbol = k.intern!('show');
  k.modulesSymbol = k.intern!('modules');
  k.moduleSymbol = k.intern!('module');
  k.listSymbol = k.intern!('list');

  k.getFieldSymbol = k.intern!('get_field');
  k.setFieldSymbol = k.intern!('set_field');
  k.getItemSymbol = k.intern!('get_item');
  k.setItemSymbol = k.intern!('set_item');

  k.modSymbol = k.intern!('mod');
  k.addSymbol = k.intern!('add');
  k.subSymbol = k.intern!('sub');
  k.mulSymbol = k.intern!('mul');
  k.floordivSymbol = k.intern!('floordiv');

  k.ltSymbol = k.intern!('lt');
  k.lteSymbol = k.intern!('lte');
  k.gtSymbol = k.intern!('gt');
  k.gteSymbol = k.intern!('gte');
  k.eqSymbol = k.intern!('eq');

  k.makeIterSymbol = k.intern!('make_iter');
  k.nextSymbol = k.intern!('next');
  k.okSymbol = k.intern!('ok');
  k.doneSymbol = k.intern!('done');
}

function initWellKnownFunctions(k: BeepContext) {
  const { bindMethod, showSymbol, thisSymbol } = k;

  k.callBoundMethod = (method: BoundMethodObj, args: RuntimeObj[]): RuntimeObj => {
    const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
    if (args.length !== expectedCount) {
      throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
    }

    if (method.mode === 'native') {
      return method.nativeFn(method.receiverInstance, args);
    }

    let callScope = k.makeScopeObj(method.scopeClosure);
    addBinding(thisSymbol, method.receiverInstance, callScope);
    for (let i = 0; i < method.argNames.length; i++) {
      addBinding(method.argNames[i], args[i], callScope);
    }
    try {
      return k.evaluate(method.body, callScope).value;
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    }
  }

  k.callMethod = (obj: RuntimeObj, methodName: SymbolObj, args: RuntimeObj[]): RuntimeObj => {
    const method = obj.type.methods.get(methodName);
    if (!method) {
      throw new Error(`No ${methodName.name} method on ${k.show(obj)}`);
    }
    return k.callBoundMethod(bindMethod(method, obj), args);
  }

  k.show = (obj: RuntimeObj): string  => {
    const showMethod = obj.type.methods.get(showSymbol);
    if (!showMethod) {
      return `<${obj.tag}:noshow>`;
    }

    const boundMethod = bindMethod(showMethod, obj);
    const result = k.callBoundMethod(boundMethod, []) as StringObj;
    return result.value;
  }

  k.isEqual = (a: RuntimeObj, b: RuntimeObj): boolean => {
    // Reference equality
    if (a === b) return true;

    // TODO: drop `0n` and `1n` once we expose proper bools to the user

    // Try a.eq(b)
    const aEqMethod = a.type.methods.get(k.eqSymbol);
    if (aEqMethod) {
      const result = k.callBoundMethod(bindMethod(aEqMethod, a), [b]) as IntObj;
      if (result.value === 0n || result.value === 1n) {
        return result.value === 1n;
      }
    }

    // Try b.eq(a)
    const bEqMethod = b.type.methods.get(k.eqSymbol);
    if (bEqMethod) {
      const result = k.callBoundMethod(bindMethod(bEqMethod, b), [a]) as IntObj;
      if (result.value === 0n || result.value === 1n) {
        return result.value === 1n;
      }
    }

    return false;
  }

  // Has to be last as `makeInterpreter` expects `callMethod` and `show`
  // to be defined in `k`. We can fix that later.
  k.evaluate = makeInterpreter(k).evaluate;
}

export function registerDefaultMethods(k: BeepContext, receiverType: TypeObj) {
  const defMethod = k.makeDefNative!(receiverType);
  defMethod('type', 0, thisObj => thisObj.type);
  defMethod('methods', 0, thisObj =>
    k.makeListObj!(thisObj.type.methods.values().toArray()));
  defMethod('get_field', 1, (thisObj, args) => {
    if (args[0].tag !== 'SymbolObj') {
      throw new Error(`Field name must be a symbol, got ${k.show!(args[0])}`);
    }
    const fieldName = args[0] as SymbolObj;

    const method = thisObj.type.methods.get(fieldName);
    if (method) {
      return k.bindMethod!(method, thisObj);
    }

    if ("ownMethods" in thisObj) {
      thisObj = thisObj as TypeObj;
      const ownMethod = thisObj.ownMethods.get(fieldName);
      if (ownMethod) {
        return ownMethod;
      }
    }

    throw new Error(`No field ${fieldName.name} on ${k.show!(thisObj.type)}`);
  });
}

function initPreludeTypeMethods(k: BeepContext) {
  // Register `type` and `methods` methods for all types
  const typeNames = [
    'type', 'symbol', 'symbol_space', 'int', 'list', 'unbound_method', 'method', 'string',
    'module', 'scope', 'map', 'structure', 'prototype', 'range',
  ];

  for (const typeName of typeNames) {
    const receiverType = getExportByName<TypeObj>(typeName, k.kernelModule, k.symbolSpaceObj)!;
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
  initModuleMethods(k as BeepContext);
  initScopeMethods(k);
  initStructMethods(k);
  initPrototypeMethods(k);
  initRangeMethods(k);
}

function initPrelude(k: BeepContext) {
  const { makeDefNative, moduleTypeObj, bindMethod, intern, makeIntObj } = k;

  const defMethod = makeDefNative<RuntimeObj>(moduleTypeObj);

  // ref_eq: compares two objects by reference using ===
  // TODO: add booleans
  const refEqMethod = defMethod('ref_eq', 2, (_, args) => args[0] === args[1] ? k.trueObj : k.falseObj);
  exportBinding(k.kernelModule, intern('ref_eq'), bindMethod(refEqMethod as UnboundMethodObj, k.kernelModule));

  // intern: takes a string and returns an interned symbol
  const internMethod = defMethod('intern', 1, (_, args) => {
    if (args[0].tag !== 'StringObj') {
      throw new Error(`intern requires a string, got ${k.show(args[0])}`);
    }
    return intern((args[0] as StringObj).value);
  });
  exportBinding(k.kernelModule, intern('intern'), bindMethod(internMethod as UnboundMethodObj, k.kernelModule));

  // load_module: loads a module from a filepath
  const loadModuleMethod = defMethod('load_module', 1, (_, args) => {
    if (args[0].tag !== 'StringObj') {
      throw new Error(`load_module requires a string filepath, got ${k.show(args[0])}`);
    }
    return k.loadModule((args[0] as StringObj).value);
  });
  exportBinding(k.kernelModule, intern('load_module'), bindMethod(loadModuleMethod as UnboundMethodObj, k.kernelModule));

  // TODO: add proper objects for these
  k.falseObj = makeIntObj(0n);
  k.trueObj = makeIntObj(1n);
  k.unitObj = makeIntObj(0n);
}

function initDynamicScope(k: BeepContext) {
  k.dynamicScope = k.makeScopeObj();
  addBinding(k.modulesSymbol, k.makeMapObj([
    [k.intern("kernel"), k.kernelModule],
  ]), k.dynamicScope);

  addBinding(k.intern("symbols"), k.symbolSpaceObj, k.dynamicScope);
  addBinding(k.intern("loadpath"), k.makeListObj([k.makeStringObj(process.cwd())]), k.dynamicScope);
}

function importNativeStdlib(k: BeepContext) {
  initIO(k);
}

function importStdlib(k: BeepContext) {
  // These modules add methods to built-in types (e.g., iterators).
  // We just load them for side effects, no need to bind them.
  const stdlibModules: string[] = ['stdlib/list.beep', 'stdlib/range.beep', 'stdlib/map.beep', 'stdlib/string.beep'];
  for (const filepath of stdlibModules) {
    k.loadModule(filepath);
  }
}
