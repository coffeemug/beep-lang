import { makeSymbolObj, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";

export type SymbolEnv = {
  namedTable: Map<string, SymbolObj>,
  indexedTable: Map<SymbolId, SymbolObj>,
  nextSymbolId: SymbolId,
}

export type SymbolId = number;

export function initSymbolEnv(): SymbolEnv {
  return {
    namedTable: new Map(),
    indexedTable: new Map(),
    nextSymbolId: 0,
  };
}

// Use after bootstrap when symbolTypeObj is set
export function intern(symbolName: string, env: SymbolEnv, symbolTypeObj: SymbolTypeObj): SymbolObj {
  let symbolObj = findSymbolByName(symbolName, env);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, symbolTypeObj!);

    // Add symbol to both tables
    env.namedTable.set(symbolName, symbolObj);
    env.indexedTable.set(symbolObj.id, symbolObj);

    env.nextSymbolId++;
  }
  return symbolObj;
}

export function findSymbolByName(symbolName: string, env: SymbolEnv) {
  return env.namedTable.get(symbolName) ?? null;
}

export function findSymbolById(symbolId: SymbolId, env: SymbolEnv) {
  return env.indexedTable.get(symbolId) ?? null;
}