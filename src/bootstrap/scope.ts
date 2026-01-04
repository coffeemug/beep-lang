import { findSymbolByName, findSymbolById, type SymbolSpaceObj, type SymbolId } from './symbol_space';
import type { RuntimeObj } from '../runtime_objects';
import type { SymbolObj } from './symbol';
import type { RuntimeObjMixin, TypeObjMixin } from './object_mixins';
import type { RootTypeObj } from './root_type';
import type { BeepContext } from './bootload';

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
    dynamicIntros: Set<SymbolId>,
    parent: ScopeObj | null,
  }

/*
  Bootstrap scope creation (used before type system is initialized)
*/
export function makeScopeTypeObj(k: BeepContext): ScopeTypeObj {
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
    dynamicIntros: new Set(),
    parent: parent ?? null,
  };
}

/*
  Initialization
*/
export function initScope(k: BeepContext) {
  const { kernelModule, scopeTypeObj } = k;

  defineBinding(scopeTypeObj.name, scopeTypeObj, kernelModule.toplevelScope);

  k.makeScopeObj = (parent?: ScopeObj): ScopeObj => ({
    tag: 'ScopeObj',
    type: scopeTypeObj,
    bindings: new Map(),
    dynamicIntros: new Set(),
    parent: parent ?? null,
  });
}

export function initScopeMethods(k: BeepContext) {
  const { makeDefNative, scopeTypeObj, makeStringObj, makeListObj, symbolSpaceObj } = k;
  const defMethod = makeDefNative<ScopeObj>(k.kernelModule.toplevelScope, scopeTypeObj);

  defMethod('show', 0, _thisObj => makeStringObj('<scope>'));

  defMethod('list', 0, thisObj => {
    const result: RuntimeObj[] = [];
    let current: ScopeObj | null = thisObj;
    while (current) {
      const symbols = [...current.bindings.keys()].map(id => findSymbolById(id, symbolSpaceObj)!);
      result.push(makeListObj(symbols));
      current = current.parent;
    }
    return makeListObj(result);
  });
}

/*
  Managing bindings
*/
export function defineBinding(name: SymbolObj, value: RuntimeObj, scope: ScopeObj) {
  scope.bindings.set(name.id, value);
}

export function getBindingByName<T extends RuntimeObj>(name: string, scope: ScopeObj, space: SymbolSpaceObj): T | null {
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

export function getBindings(scope: ScopeObj | null): [SymbolId, RuntimeObj][] {
  return scope ? [...getBindings(scope.parent), ...scope.bindings.entries()] : [];
}

export function setBinding(symbol: SymbolObj, value: RuntimeObj, scope: ScopeObj): boolean {
  let current: ScopeObj | null = scope;
  while (current) {
    if (current.bindings.has(symbol.id)) {
      current.bindings.set(symbol.id, value);
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function hasDynamicIntro(symbol: SymbolObj, scope: ScopeObj): boolean {
  let current: ScopeObj | null = scope;
  while (current) {
    if (current.dynamicIntros.has(symbol.id)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
