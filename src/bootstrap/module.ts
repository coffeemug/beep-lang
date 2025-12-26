import type { BeepKernel } from "./bootload";
import { findSymbolById } from "./symbol_env";
import { defineBinding, getBindings, makeBootstrapScope, type ScopeObj, type ScopeTypeObj } from "./scope";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { SymbolObj } from "./symbol";

export type ModuleTypeObj =
  & RuntimeObjMixin<'ModuleTypeObj', RootTypeObj>
  & TypeObjMixin

export type ModuleObj =
  & RuntimeObjMixin<'ModuleObj', ModuleTypeObj>
  & {
    name: SymbolObj,
    toplevelScope: ScopeObj,
  }

export function initKernelModule(k: BeepKernel, rootTypeObj: RootTypeObj, scopeTypeObj: ScopeTypeObj): ModuleObj {
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
  defineBinding(moduleTypeObj.name, moduleTypeObj, k.kernelModule.toplevelScope);

  return k.kernelModule;
}

export function initModule(k: BeepKernel) {
  k.makeModuleObj = (name: SymbolObj): ModuleObj => {
    const moduleObj: ModuleObj = {
      tag: 'ModuleObj',
      type: k.moduleTypeObj,
      name,
      toplevelScope: k.makeScopeObj(),
    }

    // Copy bindings from kernel module as it always gets star imported by default
    getBindings(k.kernelModule.toplevelScope).forEach(binding => {
      const [symId, value] = binding;
      defineBinding(findSymbolById(symId, k.symbolEnv)!, value, moduleObj.toplevelScope);
    });

    return moduleObj;
  }
}

export function initModuleMethods(k: BeepKernel) {
  const { makeDefNative, moduleTypeObj, makeModuleObj, makeStringObj, show } = k;

  const defMethod = makeDefNative<ModuleObj>(k.kernelModule.toplevelScope, moduleTypeObj);
  defMethod('show', 0, thisObj => makeStringObj(`<module ${show(thisObj.name)}>`));

  const defOwnMethod = makeDefNative<ModuleObj>(k.kernelModule.toplevelScope, moduleTypeObj, 'own');
  defOwnMethod('new', 1, (_, args) => makeModuleObj(args[0] as SymbolObj));
}
