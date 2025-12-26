import type { BeepKernel } from "../bootstrap/kernel";
import { findSymbolById } from "../bootstrap/symbol_env";
import { defineBinding, getBindings, makeBootstrapScope, type ScopeObj, type ScopeTypeObj } from "../runtime/scope";
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

export function initSysModule(k: BeepKernel, rootTypeObj: RootTypeObj, scopeTypeObj: ScopeTypeObj): ModuleObj {
  const { intern } = k;
  const moduleTypeObj: ModuleTypeObj = {
    tag: 'ModuleTypeObj',
    type: rootTypeObj,
    name: intern('module'),
    methods: new Map(),
  };
  k.moduleTypeObj = moduleTypeObj;

  k.sysModule = {
    tag: 'ModuleObj',
    type: moduleTypeObj,
    name: intern('sys'),
    toplevelScope: makeBootstrapScope(scopeTypeObj),
  };
  defineBinding(moduleTypeObj.name, moduleTypeObj, k.sysModule.toplevelScope);

  return k.sysModule;
}

export function initModule(k: BeepKernel) {
  k.makeModuleObj = (name: SymbolObj): ModuleObj => {
    const moduleObj: ModuleObj = {
      tag: 'ModuleObj',
      type: k.moduleTypeObj,
      name,
      toplevelScope: k.makeScopeObj(),
    }

    // Copy bindings from sys module as it always gets star imported by default
    getBindings(k.sysModule.toplevelScope).forEach(binding => {
      const [symId, value] = binding;
      defineBinding(findSymbolById(symId, k.symbolEnv)!, value, moduleObj.toplevelScope);
    });

    return moduleObj;
  }
}

export function initModuleMethods(k: BeepKernel) {
  // TODO: define methods on ModuleTypeObj
}
