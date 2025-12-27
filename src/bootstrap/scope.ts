import { findSymbolByName, type SymbolSpace, type SymbolId } from './symbol_space';
import type { RuntimeObj } from '../runtime_objects';
import type { SymbolObj } from './symbol';
import type { RuntimeObjMixin, TypeObjMixin } from './object_mixins';
import type { RootTypeObj } from './root_type';
import type { BeepKernel } from './bootload';

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
export function makeScopeTypeObj(k: BeepKernel): ScopeTypeObj {
  return {
    tag: 'ScopeTypeObj',
    type: k.rootTypeObj,
    name: k.intern('scope'),
    methods: new Map(),
    ownMethods: new Map(),
  };
}

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
  const { kernelModule, scopeTypeObj } = k;

  defineBinding(scopeTypeObj.name, scopeTypeObj, kernelModule.toplevelScope);

  k.makeScopeObj = (parent?: ScopeObj): ScopeObj => ({
    tag: 'ScopeObj',
    type: scopeTypeObj,
    bindings: new Map(),
    parent: parent ?? null,
  });
}

export function initScopeMethods(k: BeepKernel) {
  const { makeDefNative, scopeTypeObj, makeStringObj } = k;
  const defMethod = makeDefNative<ScopeObj>(k.kernelModule.toplevelScope, scopeTypeObj);

  defMethod('show', 0, _thisObj => makeStringObj('<scope>'));
}

/*
  Managing bindings
*/
export function defineBinding(name: SymbolObj, value: RuntimeObj, scope: ScopeObj) {
  scope.bindings.set(name.id, value);
}

export function getBindingByName<T extends RuntimeObj>(name: string, scope: ScopeObj, space: SymbolSpace): T | null {
  const sym = findSymbolByName(name, space);
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
