import { makeIntTypeObj, registerIntMethods } from "../data_structures/int";
import { makeListObj, makeListTypeObj, registerListMethods } from "../data_structures/list";
import { makeUnboundMethodTypeObj, nativeUnboundMethod, registerUnboundMethodMethods } from "../core_objects/unbound_method";
import { makeModuleObj, makeModuleTypeObj, type ModuleObj, type ModuleTypeObj } from "../core_objects/module";
import { defineBinding, getBindingByName } from "../runtime/scope";
import { makeRootTypeObj, registerRootTypeMethods, type RootTypeObj } from "../core_objects/root_type";
import { makeStringTypeObj, registerStringMethods } from "../data_structures/string";
import { makeSymbolTypeObj, registerSymbolMethods, type SymbolTypeObj } from "../core_objects/symbol";
import { intern, intern_, type SymbolEnv } from "./symbol_env";
import { makeBoundMethodTypeObj, registerBoundMethodMethods } from "../core_objects/bound_method";

export function initSysModule(env: SymbolEnv): ModuleObj {
  const sysModule = bootstrapSysModule(env);
  initPreludeTypes(sysModule, env);
  return sysModule;
}

function bootstrapSysModule(env: SymbolEnv): ModuleObj {
  /*
    Create core types ('type', 'symbol', 'module') and intern their names.
    These are created before sysModule exists, so bindingModule is set retroactively.
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  rootTypeObj.name = intern_('type', env, symbolTypeObj);
  symbolTypeObj.name = intern_('symbol', env, symbolTypeObj);

  // Now that symbolTypeObj is complete, set it on env so intern() works
  env.symbolTypeObj = symbolTypeObj;

  const moduleTypeObj = makeModuleTypeObj(
    intern('module', env), rootTypeObj) as ModuleTypeObj;

  // Create 'sys' module
  const sysModule = makeModuleObj(
    intern('sys', env),
    moduleTypeObj);

  // Set bindingModule retroactively for bootstrap types
  rootTypeObj.bindingModule = sysModule;
  symbolTypeObj.bindingModule = sysModule;
  moduleTypeObj.bindingModule = sysModule;

  // Bind type names in the sys module
  defineBinding(rootTypeObj.name, rootTypeObj, sysModule.toplevelScope);
  defineBinding(symbolTypeObj.name, symbolTypeObj, sysModule.toplevelScope);
  defineBinding(moduleTypeObj.name, moduleTypeObj, sysModule.toplevelScope);

  return sysModule;
}

function initPreludeTypes(m: ModuleObj, env: SymbolEnv) {
  const rootTypeObj = getBindingByName<RootTypeObj>('type', m.toplevelScope, env)!;

  // Intern special symbols needed by the interpreter
  intern('this', env);

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
  // TODO register bound/unbound method methods
}
