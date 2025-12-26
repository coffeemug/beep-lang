import type { BeepKernel } from "../bootstrap/kernel";
import { findSymbolById } from "../bootstrap/symbol_env";
import { defineBinding, getBinding, getBindings, makeScope, type Scope } from "../runtime/scope";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { SymbolObj } from "./symbol";

export type ModuleTypeObj =
  & RuntimeObjMixin<'ModuleTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type NamedModuleTypeObj =
  & RuntimeObjMixin<'NamedModuleTypeObj', ModuleTypeObj>
  & TypeObjMixin
  & {
    name: SymbolObj,
  }
export type NamedModuleObj =
  & RuntimeObjMixin<'NamedModuleObj', NamedModuleTypeObj>
  & {
    toplevelScope: Scope,
  }

export function initSysModule(k: BeepKernel, rootTypeObj: RootTypeObj): NamedModuleObj {
  const { intern } = k;
  const moduleTypeObj: ModuleTypeObj = {
    tag: 'ModuleTypeObj',
    type: rootTypeObj,
    name: intern('module'),
    methods: new Map(),
  };
  k.moduleTypeObj = moduleTypeObj;

  const sysModuleType: NamedModuleTypeObj = {
      tag: 'NamedModuleTypeObj',
      type: moduleTypeObj,
      name: intern('sys'),
      methods: new Map(),
  };
  k.sysModule = {
    tag: 'NamedModuleObj',
    type: sysModuleType,
    toplevelScope: makeScope(),
  };
  defineBinding(moduleTypeObj.name, moduleTypeObj, k.sysModule.toplevelScope);

  return k.sysModule;
}

export function initModule(k: BeepKernel) {
  k.makeNamedModuleObj = (name: SymbolObj): NamedModuleObj => {
    // make a named type
    const namedModuleTypeObj: NamedModuleTypeObj = {
      tag: 'NamedModuleTypeObj',
      type: k.moduleTypeObj,
      name,
      methods: new Map(),
    };

    // instantiate the named type
    const namedModuleObj: NamedModuleObj = {
      tag: 'NamedModuleObj',
      type: namedModuleTypeObj,
      toplevelScope: makeScope(),
    }

    // Copy bindings from sys module as it always gets star imported by default
    getBindings(k.sysModule.toplevelScope).forEach(binding => {
      const [symId, value] = binding;
      defineBinding(findSymbolById(symId, k.symbolEnv)!, value, namedModuleObj.toplevelScope);
    });

    // TODO: we just made a named module type. We should define appropriate
    // methods on it.

    return namedModuleObj;
  }
}

export function initModuleMethods(k: BeepKernel) {
  // TODO: define methods on ModuleTypeObj (that would be applicable to
  // NamedModuleTypeObj).
}

