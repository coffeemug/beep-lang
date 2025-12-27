import { initInt, initIntMethods, type IntObj, type IntTypeObj } from "../data_structures/int";
import { initList, initListMethods, type ListObj, type ListTypeObj } from "../data_structures/list";
import { initUnboundMethod, initUnboundMethodMethods, type NativeFn, type UnboundMethodObj, type UnboundMethodTypeObj } from "./unbound_method";
import { initModule, initModuleMethods, initKernelModule, type ModuleTypeObj, type ModuleObj } from "./module";
import { defineBinding, getBindingByName, initScope, initScopeMethods, makeScopeTypeObj, type ScopeObj, type ScopeTypeObj } from "./scope";
import { makeRootTypeObj, initRootTypeMethods, type RootTypeObj } from "./root_type";
import { initString, initStringMethods, type StringObj, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, initSymbolMethods, type SymbolObj, type SymbolTypeObj } from "./symbol";
import { initSymbolSpace, intern, type SymbolSpace } from "./symbol_space";
import { initBoundMethod, initBoundMethodMethods, type BoundMethodObj, type BoundMethodTypeObj } from "./bound_method";
import type { Expr } from "../runtime/parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeInterpreter } from "../runtime/interpreter";
import { initMap, initMapMethods, type MapObj, type MapTypeObj } from "../data_structures/map";

export type BeepKernel = {
  symbolSpace: SymbolSpace,
  kernelModule: ModuleObj,
  dynamicScope: ScopeObj,

  // Well-known type objects
  rootTypeObj: RootTypeObj,
  symbolTypeObj: SymbolTypeObj,
  moduleTypeObj: ModuleTypeObj,
  intTypeObj: IntTypeObj,
  stringTypeObj: StringTypeObj,
  listTypeObj: ListTypeObj,
  mapTypeObj: MapTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  scopeTypeObj: ScopeTypeObj,

  // Well-known symbols
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,
  atSymbol: SymbolObj,
  getFieldSymbol: SymbolObj,

  // Well-known functions
  makeIntObj: (value: number) => IntObj,
  makeStringObj: (value: string) => StringObj,
  makeListObj: (elements: RuntimeObj[]) => ListObj,
  makeMapObj: (pairs: [SymbolObj, RuntimeObj][]) => MapObj,
  makeScopeObj: (parent?: ScopeObj) => ScopeObj,
  intern: (name: string) => SymbolObj,

  makeModuleObj: (name: SymbolObj) => ModuleObj,

  makeUnboundMethodObj: (scopeClosure: ScopeObj, receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr) => UnboundMethodObj,
  makeDefNative: <T extends RuntimeObj>(scopeClosure: ScopeObj, receiverType: TypeObj, binding?: 'instance' | 'own') =>
    (name: string, argCount: number, nativeFn: NativeFn<T>) => void,
  bindMethod(method: UnboundMethodObj, receiverInstance: RuntimeObj): BoundMethodObj,

  // More well-known functions
  evaluate(expr: Expr, scope: ScopeObj): RuntimeObj,
  show: (obj: RuntimeObj) => string,
  callMethod: (method: BoundMethodObj, args: RuntimeObj[]) => RuntimeObj,
}

export function createKernel(): BeepKernel {
  let kernel: Partial<BeepKernel> = {
    symbolSpace: initSymbolSpace(),
  };

  kernel = bootstrapKernelModule(kernel);
  kernel = initPreludeTypes(kernel);
  initWellKnownFunctions(kernel as BeepKernel);
  initPreludeTypeMethods(kernel as BeepKernel);
  initDynamicScope(kernel as BeepKernel);

  return kernel as BeepKernel;
}

function bootstrapKernelModule(k: Partial<BeepKernel>): Partial<BeepKernel> {
  /*
    Create core types ('type', 'symbol', 'module', 'scope') and intern their names.
    These are created before kernelModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  k.intern = (name: string) => intern(name, k.symbolSpace!, symbolTypeObj);

  rootTypeObj.name = k.intern('type');
  symbolTypeObj.name = k.intern('symbol');

  // Assign rootTypeObj before creating scopeTypeObj (which needs it)
  k.rootTypeObj = rootTypeObj;

  // Create scopeTypeObj early so we can create scopes during bootstrap
  k.scopeTypeObj = makeScopeTypeObj(k as BeepKernel);
  const kernelModule = initKernelModule(k as BeepKernel, rootTypeObj, k.scopeTypeObj);

  // Bind type names in the kernel module
  defineBinding(rootTypeObj.name, rootTypeObj, kernelModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, kernelModule.toplevelScope);

  return {
    ...k,
    symbolTypeObj,
    kernelModule,
  };
}

function initPreludeTypes(k: Partial<BeepKernel>): Partial<BeepKernel> {
  // Init types that can use the standard pattern
  initInt(k as BeepKernel);
  initString(k as BeepKernel);
  initList(k as BeepKernel);
  initMap(k as BeepKernel);
  initUnboundMethod(k as BeepKernel);
  initBoundMethod(k as BeepKernel);
  initModule(k as BeepKernel);
  initScope(k as BeepKernel);

  return {
    ...k,
    thisSymbol: k.intern!('this'),
    showSymbol: k.intern!('show'),
    atSymbol: k.intern!('at'),
    getFieldSymbol: k.intern!('get_field'),
  };
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

function initPreludeTypeMethods(k: BeepKernel) {
  initIntMethods(k);
  initStringMethods(k);
  initListMethods(k);
  initMapMethods(k);
  initUnboundMethodMethods(k);
  initBoundMethodMethods(k);
  initSymbolMethods(k);
  initRootTypeMethods(k);
  initModuleMethods(k as BeepKernel);
  initScopeMethods(k);

  // Register `type` and `methods` methods for all types
  const typeNames = [
    'type', 'symbol', 'int', 'list', 'unbound_method', 'method', 'string',
    'module', 'scope',
  ];
  const scope = k.kernelModule!.toplevelScope;

  for (const typeName of typeNames) {
    const receiverType = getBindingByName<TypeObj>(typeName, scope, k.symbolSpace)!;
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
}

function initDynamicScope(k: BeepKernel) {
  k.dynamicScope = k.makeScopeObj();
  defineBinding(k.intern("modules"), k.makeMapObj([
    [k.intern("kernel"), k.kernelModule],
  ]), k.dynamicScope);
}
