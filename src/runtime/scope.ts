import { findSymbolByName, type SymbolEnv, type SymbolId } from '../bootstrap/symbol_env';
import type { RuntimeObj } from '../runtime_objects';
import type { SymbolObj } from '../core_objects/symbol';
import type { RuntimeObjMixin, TypeObjMixin } from '../core_objects/object_mixins';
import type { RootTypeObj } from '../core_objects/root_type';
import type { BeepKernel } from '../bootstrap/kernel';

/*
  Type definitions
*/
export type ScopeTypeObj =
  & RuntimeObjMixin<'ScopeTypeObj', RootTypeObj>
  & TypeObjMixin

export type ScopeObj =
  & RuntimeObjMixin<'ScopeObj', ScopeTypeObj>
  & {
    bindings: Map<SymbolId, RuntimeObj>,
    parent: ScopeObj | null,
  }

/*
  Bootstrap scope creation (used before type system is initialized)
*/
export function makeBootstrapScope(scopeTypeObj: ScopeTypeObj, parent?: ScopeObj): ScopeObj {
  return {
    tag: 'ScopeObj',
    type: scopeTypeObj,
    bindings: new Map(),
    parent: parent ?? null,
  };
}

/*
  Initialization
*/
export function initScope(k: BeepKernel) {
  const { sysModule, scopeTypeObj } = k;

  defineBinding(scopeTypeObj.name, scopeTypeObj, sysModule.toplevelScope);

  k.makeScopeObj = (parent?: ScopeObj): ScopeObj => ({
    tag: 'ScopeObj',
    type: scopeTypeObj,
    bindings: new Map(),
    parent: parent ?? null,
  });
}

export function initScopeMethods(k: BeepKernel) {
  const { makeDefNative, scopeTypeObj, makeStringObj } = k;
  const defMethod = makeDefNative<ScopeObj>(k.sysModule.toplevelScope, scopeTypeObj);

  defMethod('show', 0, _thisObj => makeStringObj('<scope>'));
}

/*
  Managing bindings
*/
export function defineBinding(name: SymbolObj, value: RuntimeObj, scope: ScopeObj) {
  scope.bindings.set(name.id, value);
}

export function getBindingByName<T extends RuntimeObj>(name: string, scope: ScopeObj, env: SymbolEnv): T | null {
  const sym = findSymbolByName(name, env);
  return sym && getBinding(sym, scope) as T;
}

export function getBinding(symbol: SymbolObj, scope: ScopeObj) {
  return getBinding_(symbol, scope);
}

function getBinding_(symbol: SymbolObj, scope: ScopeObj | null): RuntimeObj | null {
  if (!scope) {
    return null;
  }

  const binding = scope.bindings.get(symbol.id);
  return binding ?? getBinding_(symbol, scope.parent);
}

export function getBindings(scope: ScopeObj | null): [number, RuntimeObj][] {
  return scope ? [...getBindings(scope.parent), ...scope.bindings.entries()] : [];
}
