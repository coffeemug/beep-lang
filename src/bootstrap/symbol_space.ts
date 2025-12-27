import { makeSymbolObj, type SymbolObj, type SymbolTypeObj } from "./symbol";

export type SymbolSpace = {
  namedTable: Map<string, SymbolObj>,
  indexedTable: Map<SymbolId, SymbolObj>,
  nextSymbolId: SymbolId,
}

export type SymbolId = number;

export function initSymbolSpace(): SymbolSpace {
  return {
    namedTable: new Map(),
    indexedTable: new Map(),
    nextSymbolId: 0,
  };
}

// Use after bootstrap when symbolTypeObj is set
export function intern(symbolName: string, space: SymbolSpace, symbolTypeObj: SymbolTypeObj): SymbolObj {
  let symbolObj = findSymbolByName(symbolName, space);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, space.nextSymbolId, symbolTypeObj!);

    // Add symbol to both tables
    space.namedTable.set(symbolName, symbolObj);
    space.indexedTable.set(symbolObj.id, symbolObj);

    space.nextSymbolId++;
  }
  return symbolObj;
}

export function findSymbolByName(symbolName: string, space: SymbolSpace) {
  return space.namedTable.get(symbolName) ?? null;
}

export function findSymbolById(symbolId: SymbolId, space: SymbolSpace) {
  return space.indexedTable.get(symbolId) ?? null;
}