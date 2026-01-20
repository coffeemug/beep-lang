import type { BeepContext } from "./bootload";
import { findSymbolById, findSymbolByName, type SymbolId, type SymbolSpaceObj } from "./symbol_space";
import { getBinding, type ScopeTypeObj } from "./scope";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { SymbolObj } from "./symbol";
import type { MapObj } from "../data_structures/map";
import type { RuntimeObj } from "../runtime_objects";

export type ModuleTypeObj =
  & RuntimeObjMixin<'ModuleTypeObj', RootTypeObj>
  & TypeObjMixin

export type ModuleObj =
  & RuntimeObjMixin<'ModuleObj', ModuleTypeObj>
  & {
    name: SymbolObj,
    exports: Map<SymbolId, RuntimeObj>,
  }

export function initKernelModule(k: BeepContext, rootTypeObj: RootTypeObj, scopeTypeObj: ScopeTypeObj): ModuleObj {
  const { intern } = k;
  const moduleTypeObj: ModuleTypeObj = {
    tag: 'ModuleTypeObj',
    type: rootTypeObj,
    name: intern('module'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  k.moduleTypeObj = moduleTypeObj;

  k.kernelModule = {
    tag: 'ModuleObj',
    type: moduleTypeObj,
    name: intern('kernel'),
    exports: new Map(),
  };
  exportBinding(k.kernelModule, moduleTypeObj.name, moduleTypeObj);

  return k.kernelModule;
}

export function initModule(k: BeepContext) {
  k.makeModuleObj = (name: SymbolObj): ModuleObj => {
    const modules = getBinding(k.modulesSymbol, k.dynamicScope) as MapObj;
    if (modules.kv.has(name)) {
      return modules.kv.get(name) as ModuleObj;
    }

    const moduleObj: ModuleObj = {
      tag: 'ModuleObj',
      type: k.moduleTypeObj,
      name,
      exports: new Map(),
    }

    modules.kv.set(name, moduleObj);

    return moduleObj;
  }
}

export function initModuleMethods(k: BeepContext) {
  const { makeDefNative, moduleTypeObj, makeModuleObj, makeStringObj, intern, show } = k;

  const moduleName = (module: ModuleObj) =>
    module.name.name.split('/').pop()!

  const defMethod = makeDefNative<ModuleObj>(moduleTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(`<module ${show(intern(moduleName(thisObj)))}>`));
  defMethod('fullname', 0, thisObj => thisObj.name);
  defMethod('name', 0, thisObj =>
    k.intern(moduleName(thisObj)));
  defMethod('exports', 0, thisObj => {
    const pairs: [SymbolObj, RuntimeObj][] = [];
    for (const [symId, value] of thisObj.exports) {
      const sym = findSymbolById(symId, k.symbolSpaceObj);
      if (sym) pairs.push([sym, value]);
    }
    return k.makeMapObj(pairs);
  });
  defMethod('get_field', 1, (thisObj, args) => {
    const fieldName = args[0] as SymbolObj;
    const value = getExportBinding(thisObj, fieldName);
    if (value === null) {
      throw new Error(`Export ${fieldName.name} not found in module ${thisObj.name.name}`);
    }
    return value;
  });

  const defOwnMethod = makeDefNative<ModuleObj>(moduleTypeObj, { binding: 'own' });
  defOwnMethod('new', 1, (_, args) => makeModuleObj(args[0] as SymbolObj));
}

export function exportBinding(module: ModuleObj, name: SymbolObj, value: RuntimeObj) {
  module.exports.set(name.id, value);
}

export function getExports(module: ModuleObj) {
  return [...module.exports.entries()];
}

export function getExportBinding(module: ModuleObj, symbol: SymbolObj) {
  return module.exports.get(symbol.id) ?? null;
}

export function getExportByName<T extends RuntimeObj>(name: string, module: ModuleObj, space: SymbolSpaceObj): T | null {
  const sym = findSymbolByName(name, space);
  return sym && getExportBinding(module, sym) as T;
}