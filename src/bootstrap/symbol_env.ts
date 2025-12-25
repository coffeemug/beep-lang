import { makeSymbolObj, type SymbolObj, type SymbolTypeObj } from "../core_objects/symbol";

export type SymbolEnv = {
  symbolTable: Map<string, SymbolObj>,
  nextSymbolId: SymbolId,
}

export type SymbolId = number;

export function initSymbolEnv(): SymbolEnv {
  return {
    symbolTable: new Map(),
    nextSymbolId: 0,
  };
}

// Use after bootstrap when symbolTypeObj is set
export function intern(symbolName: string, env: SymbolEnv, symbolTypeObj: SymbolTypeObj): SymbolObj {
  let symbolObj = findSymbolByName(symbolName, env);
  if (!symbolObj) {
    symbolObj = makeSymbolObj(symbolName, env.nextSymbolId, symbolTypeObj!);
    env.symbolTable.set(symbolName, symbolObj);
    env.nextSymbolId++;
  }
  return symbolObj;
}

export function findSymbolByName(symbolName: string, env: SymbolEnv) {
  return env.symbolTable.get(symbolName) ?? null;
}
