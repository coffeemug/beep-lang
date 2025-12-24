import { makeIntTypeObj, registerIntMethods, type IntTypeObj } from "../data_structures/int";
import { makeListObj, makeListTypeObj, registerListMethods, type ListTypeObj } from "../data_structures/list";
import { makeUnboundMethodTypeObj, nativeUnboundMethod, registerUnboundMethodMethods, type UnboundMethodTypeObj } from "../core_objects/unbound_method";
import { makeModuleObj, makeModuleTypeObj, type ModuleObj, type ModuleTypeObj } from "../core_objects/module";
import { defineBinding } from "../runtime/scope";
import { makeRootTypeObj, registerRootTypeMethods, type RootTypeObj } from "../core_objects/root_type";
import { makeStringTypeObj, registerStringMethods, type StringTypeObj } from "../data_structures/string";
import { makeSymbolTypeObj, registerSymbolMethods, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";
import { initSymbolEnv, intern, intern_, type SymbolEnv } from "./symbol_env";
import { makeBoundMethodTypeObj, registerBoundMethodMethods, type BoundMethodTypeObj } from "../core_objects/bound_method";

export type BeepKernel = {
  symbolEnv: SymbolEnv,
  sysModule: ModuleObj,
  wellKnowns: WellKnownObjects,
}

export type WellKnownObjects = {
  rootTypeObj: RootTypeObj,
  symbolTypeObj: SymbolTypeObj,
  moduleTypeObj: ModuleTypeObj,
  intTypeObj: IntTypeObj,
  stringTypeObj: StringTypeObj,
  listTypeObj: ListTypeObj,
  unboundMethodTypeObj: UnboundMethodTypeObj,
  boundMethodTypeObj: BoundMethodTypeObj,
  thisSymbol: SymbolObj,
  showSymbol: SymbolObj,
}

type PartialKernel = Omit<Partial<BeepKernel>, 'wellKnowns'> & {
  wellKnowns: Partial<WellKnownObjects>,
}

export function createKernel(): BeepKernel {
  let kernel: PartialKernel = {
    wellKnowns: {},
  };
  kernel.symbolEnv = initSymbolEnv();
  
  kernel = bootstrapSysModule(kernel);
  kernel = initPreludeTypes(kernel);

  return kernel as BeepKernel;
}

function bootstrapSysModule(k: PartialKernel): PartialKernel {
  /*
    Create core types ('type', 'symbol', 'module') and intern their names.
    These are created before sysModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  rootTypeObj.name = intern_('type', k.symbolEnv!, symbolTypeObj);
  symbolTypeObj.name = intern_('symbol', k.symbolEnv!, symbolTypeObj);

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
    wellKnowns: {
      ...k.wellKnowns,
      rootTypeObj,
      symbolTypeObj,
      moduleTypeObj,
    }
  };
}

function initPreludeTypes(k: PartialKernel): PartialKernel {
  const env = k.symbolEnv!;
  const m = k.sysModule!;
  const rootTypeObj = k.wellKnowns.rootTypeObj!;

  // Init core types
  const intTypeObj = makeIntTypeObj(intern('int', env), rootTypeObj, m);
  const listTypeObj = makeListTypeObj(intern('list', env), rootTypeObj, m);
  const unboundMethodTypeObj = makeUnboundMethodTypeObj(intern('unbound_method', env), rootTypeObj, m);
  const boundMethodTypeObj = makeBoundMethodTypeObj(intern('method', env), rootTypeObj, m);
  const stringTypeObj = makeStringTypeObj(intern('string', env), rootTypeObj, m);

  defineBinding(intTypeObj.name, intTypeObj, m.toplevelScope);
  defineBinding(listTypeObj.name, listTypeObj, m.toplevelScope);
  defineBinding(unboundMethodTypeObj.name, unboundMethodTypeObj, m.toplevelScope);
  defineBinding(boundMethodTypeObj.name, boundMethodTypeObj, m.toplevelScope);
  defineBinding(stringTypeObj.name, stringTypeObj, m.toplevelScope);

  const typeNames = ['type', 'symbol', 'int', 'list', 'unbound_method', 'method', 'module', 'string'];

  // Native `type` method - returns the object's type. Registering
  // here because it's the same for every type.
  for (const typeName of typeNames) {
    const mType = nativeUnboundMethod(m, env, typeName, 'type', 0, thisObj =>
      thisObj.type);
    mType.receiverType.methods.set(mType.name, mType);
  }

  // Native `methods` method - returns a list of method names that can be called.
  for (const typeName of typeNames) {
    const mMethods = nativeUnboundMethod(m, env, typeName, 'methods', 0, thisObj => {
      const methods = thisObj.type.methods.values().toArray();
      return makeListObj(methods, listTypeObj);
    });
    mMethods.receiverType.methods.set(mMethods.name, mMethods);
  }

  registerIntMethods(m, env);
  registerListMethods(m, env);
  registerStringMethods(m, env);
  registerSymbolMethods(m, env);
  registerUnboundMethodMethods(m, env);
  registerBoundMethodMethods(m, env);
  registerRootTypeMethods(m, env);

  return {
    ...k,
    wellKnowns: {
      ...k.wellKnowns,
      intTypeObj,
      stringTypeObj,
      listTypeObj,
      unboundMethodTypeObj,
      boundMethodTypeObj,
      thisSymbol: intern('this', env),
      showSymbol: intern('show', env),
    }
  };
}
