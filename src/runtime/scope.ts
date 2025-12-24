import { findSymbolByName, type SymbolEnv, type SymbolId } from '../bootstrap/symbol_env';
import type { RuntimeObj } from '../runtime_objects';
import type { SymbolObj } from '../core_objects/symbol';

export type Scope = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Scope | null,
}

export function makeScope(parent?: Scope): Scope {
  return {
    bindings: new Map(),
    parent: parent ?? null,
  }
}

/*
  Managing bindings
*/
export function defineBinding(name: SymbolObj, value: RuntimeObj, scope: Scope) {
  scope.bindings.set(name.id, value);
}

export function getBindingByName<T extends RuntimeObj>(name: string, scope: Scope, env: SymbolEnv): T | null {
  const sym = findSymbolByName(name, env);
  return sym && getBinding(sym, scope) as T;
}

export function getBinding(symbol: SymbolObj, scope: Scope) {
  return getBinding_(symbol, scope);
}

function getBinding_(symbol: SymbolObj, scope: Scope | null): RuntimeObj | null {
  if (!scope) {
    return null;
  }

  const binding = scope.bindings.get(symbol.id);
  return binding ?? getBinding_(symbol, scope.parent);
}
