import type { RuntimeObj } from "../runtime_objects";
import { findSymbolByName, type SymbolEnv } from "../bootstrap/symbol_env";
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
    topScope: Scope,
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
    topScope: makeScope(),
  };
}

/*
  Scope management
*/
export function pushScope(m: ModuleObj): Scope {
  m.topScope = makeScope(m.topScope);
  return m.topScope;
}

export function popScope(m: ModuleObj) {
  if (!m.topScope.parent) {
    throw new Error("This should never happen!")
  }
  m.topScope = m.topScope.parent;
}

export function withScope<T>(m: ModuleObj, parent: Scope, fn: () => T): T {
  const savedFrame = m.topScope;
  m.topScope = makeScope(parent);
  try {
    return fn();
  } finally {
    m.topScope = savedFrame;
  }
}
