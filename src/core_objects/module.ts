import { makeScope, type Scope } from "../runtime/scope";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { SymbolObj } from "./symbol";

export type ModuleTypeObj =
  & RuntimeObjMixin<'ModuleTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type ModuleObj =
  & RuntimeObjMixin<'ModuleObj', ModuleTypeObj>
  & {
    name: SymbolObj,
    toplevelScope: Scope,
  }

export function makeModuleTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): Omit<ModuleTypeObj, 'bindingModule'> {
  return {
    tag: 'ModuleTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeModuleObj(moduleName: SymbolObj, moduleTypeObj: ModuleTypeObj): ModuleObj {
  return {
    tag: 'ModuleObj',
    type: moduleTypeObj,
    name: moduleName,
    toplevelScope: makeScope(),
  };
}
