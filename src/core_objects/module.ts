import type { RuntimeObj } from "../runtime_objects";
import { findSymbolByName, type SymbolEnv } from "../bootstrap/symbol_env";
import { makeFrame, type Frame } from "../runtime/frame";
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
    topFrame: Frame,
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
    topFrame: makeFrame(),
  };
}

export function defineBinding(name: SymbolObj, value: RuntimeObj, module: ModuleObj) {
  module.topFrame.bindings.set(name.id, value);
}

export function getBindingByName<T extends RuntimeObj>(name: string, m: ModuleObj, env: SymbolEnv): T | null {
  const sym = findSymbolByName(name, env);
  return sym && getBinding(sym, m) as T;
}

export function getBinding(symbol: SymbolObj, module: ModuleObj) {
  return getBinding_(symbol, module.topFrame);
}

function getBinding_(symbol: SymbolObj, frame: Frame | null): RuntimeObj | null {
  if (!frame) {
    return null;
  }

  const binding = frame.bindings.get(symbol.id);
  return binding ?? getBinding_(symbol, frame.parent);
}
