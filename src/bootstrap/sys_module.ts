import { makeIntTypeObj, registerIntMethods } from "../data_structures/int";
import { makeListObj, makeListTypeObj, registerListMethods } from "../data_structures/list";
import { getThisObj, makeMethodTypeObj, nativeMethod, registerMethodMethods, type MethodObj } from "../core_objects/methods";
import { defineBinding, getBindingByName, makeModuleObj, makeModuleTypeObj, type ModuleObj } from "../core_objects/module";
import { makeRootTypeObj, registerRootTypeMethods, type RootTypeObj } from "../core_objects/root_type";
import { makeStringTypeObj, registerStringMethods } from "../data_structures/string";
import { makeSymbolTypeObj, registerSymbolMethods, type SymbolTypeObj } from "../core_objects/symbol";
import { intern, intern_, type SymbolEnv } from "./symbol_env";

export function initSysModule(env: SymbolEnv): ModuleObj {
  const sysModule = bootstrapSysModule(env);
  initPreludeTypes(sysModule, env);
  return sysModule;
}

function bootstrapSysModule(env: SymbolEnv): ModuleObj {
  /*
    Create core types ('type', 'symbol', 'module') and intern their names
  */
  const rootTypeObj = makeRootTypeObj() as RootTypeObj;
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj) as SymbolTypeObj;

  rootTypeObj.name = intern_('type', env, symbolTypeObj);
  symbolTypeObj.name = intern_('symbol', env, symbolTypeObj);

  // Now that symbolTypeObj is complete, set it on env so intern() works
  env.symbolTypeObj = symbolTypeObj;

  const moduleTypeObj = makeModuleTypeObj(
    intern('module', env), rootTypeObj);

  // Create 'sys' module
  const sysModule = makeModuleObj(
    intern('sys', env),
    moduleTypeObj);

  // Bind type names in the sys module
  defineBinding(rootTypeObj.name, rootTypeObj, sysModule);
  defineBinding(symbolTypeObj.name, symbolTypeObj, sysModule);
  defineBinding(moduleTypeObj.name, moduleTypeObj, sysModule);

  return sysModule;
}

function initPreludeTypes(m: ModuleObj, env: SymbolEnv) {
  const rootTypeObj = getBindingByName<RootTypeObj>('type', m, env)!;

  // Intern special symbols needed by the interpreter
  intern('this', env);

  const intTypeObj = makeIntTypeObj(intern('int', env), rootTypeObj);
  const listTypeObj = makeListTypeObj(intern('list', env), rootTypeObj);
  const methodTypeObj = makeMethodTypeObj(intern('method', env), rootTypeObj);
  const stringTypeObj = makeStringTypeObj(intern('string', env), rootTypeObj);

  defineBinding(intTypeObj.name, intTypeObj, m);
  defineBinding(listTypeObj.name, listTypeObj, m);
  defineBinding(methodTypeObj.name, methodTypeObj, m);
  defineBinding(stringTypeObj.name, stringTypeObj, m);

  const typeNames = ['type', 'symbol', 'int', 'list', 'method', 'module', 'string'];

  // Native `type` method - returns the object's type. Registering
  // here because it's the same for every type.
  for (const typeName of typeNames) {
    const method = nativeMethod(m, env, typeName, 'type', 0,
      (method: MethodObj) => getThisObj(method, env).type
    );
    method.receiverType.methods.set(method.name, method);
  }

  // Native `methods` method - returns a list of method names that can be called.
  for (const typeName of typeNames) {
    const method = nativeMethod(m, env, typeName, 'methods', 0, (method: MethodObj) => {
      const thisObj = getThisObj(method, env);
      const methods = thisObj.type.methods.values().toArray();
      return makeListObj(methods, listTypeObj);
    });
    method.receiverType.methods.set(method.name, method);
  }

  registerIntMethods(m, env);
  registerListMethods(m, env);
  registerStringMethods(m, env);
  registerSymbolMethods(m, env);
  registerMethodMethods(m, env);
  registerRootTypeMethods(m, env);
}
