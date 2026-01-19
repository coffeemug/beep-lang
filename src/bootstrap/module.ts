import type { BeepContext } from "./bootload";
import { findSymbolById } from "./symbol_space";
import { addBinding, getBinding, getBindings, makeBootstrapScope, type ScopeObj, type ScopeTypeObj } from "./scope";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { SymbolObj } from "./symbol";
import type { MapObj } from "../data_structures/map";

export type ModuleTypeObj =
  & RuntimeObjMixin<'ModuleTypeObj', RootTypeObj>
  & TypeObjMixin

export type ModuleObj =
  & RuntimeObjMixin<'ModuleObj', ModuleTypeObj>
  & {
    name: SymbolObj,
    toplevelScope: ScopeObj,
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
    toplevelScope: makeBootstrapScope(scopeTypeObj),
  };
  addBinding(moduleTypeObj.name, moduleTypeObj, k.kernelModule.toplevelScope);
  addBinding(intern("this"), k.kernelModule, k.kernelModule.toplevelScope);

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
      toplevelScope: k.makeScopeObj(),
    }

    // TODO: copying bindings like we do below pollutes the toplevel scope of
    // every module. Module users should not see these bindings, only the code
    // executing in the module should.

    // Copy bindings from kernel module as it always gets star imported by default
    getBindings(k.kernelModule.toplevelScope).forEach(binding => {
      const [symId, value] = binding;
      addBinding(findSymbolById(symId, k.symbolSpaceObj)!, value, moduleObj.toplevelScope);
    });
    addBinding(k.thisSymbol, moduleObj, moduleObj.toplevelScope);

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

  const defOwnMethod = makeDefNative<ModuleObj>(moduleTypeObj, { binding: 'own' });
  defOwnMethod('new', 1, (_, args) => makeModuleObj(args[0] as SymbolObj));
}
