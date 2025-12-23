import { makeSymbolObj, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";

export type SymbolEnv = {
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: SymbolId,
  symbolTypeObj: SymbolTypeObj | null,  // null only during bootstrap
}

export type SymbolId = number;

export function initSymbolEnv(): SymbolEnv {
  return {
    symbolTable: new Map(),
    nextSymbolId: 0,
    symbolTypeObj: null,
  };
}

// Use during bootstrap before symbolTypeObj is set
export function intern_(symbolName: string, env: SymbolEnv, symbolTypeObj: SymbolTypeObj): SymbolObj {
  let symbolObj = findSymbolByName(symbolName, env);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, symbolTypeObj);
    env.symbolTable.set(symbolName, symbolObj);
    env.nextSymbolId++;
  }
  return symbolObj;
}

// Use after bootstrap when symbolTypeObj is set
export function intern(symbolName: string, env: SymbolEnv): SymbolObj {
  if (!env.symbolTypeObj) {
    throw new Error('Cannot call intern() before bootstrap completes');
  }
  return intern_(symbolName, env, env.symbolTypeObj);
}

export function findSymbolByName(symbolName: string, env: SymbolEnv) {
  return env.symbolTable.get(symbolName) ?? null;
}
