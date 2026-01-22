import { makeSymbolObj, type SymbolObj, type SymbolTypeObj } from "./symbol";
import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import type { RootTypeObj } from "./root_type";
import type { BeepContext } from "./bootload";
import type { StringObj } from "../data_structures/string";
import type { IntObj } from "../data_structures/int";

export type SymbolSpaceTypeObj =
  & RuntimeObjMixin<'SymbolSpaceTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolSpaceObj =
  & RuntimeObjMixin<'SymbolSpaceObj', SymbolSpaceTypeObj>
  & {
    namedTable: Map<string, SymbolObj>,
    indexedTable: Map<SymbolId, SymbolObj>,
    nextSymbolId: SymbolId,
  }

export type SymbolId = bigint;

export function makeSymbolSpaceTypeObj(rootTypeObj: RootTypeObj): SymbolSpaceTypeObj {
  return {
    tag: 'SymbolSpaceTypeObj',
    type: rootTypeObj,
    name: null as any, // Set later after intern is available
    methods: new Map(),
    ownMethods: new Map(),
  };
}

export function makeSymbolSpaceObj(typeObj: SymbolSpaceTypeObj): SymbolSpaceObj {
  return {
    tag: 'SymbolSpaceObj',
    type: typeObj,
    namedTable: new Map(),
    indexedTable: new Map(),
    nextSymbolId: 0n,
  };
}

export function initSymbolSpaceMethods(k: BeepContext) {
  const { makeStringObj, makeDefMethodNative: makeDefNative, symbolSpaceTypeObj, makeListObj } = k;
  const defMethod = makeDefNative<SymbolSpaceObj>(symbolSpaceTypeObj);
  defMethod('show', 0, () => makeStringObj("<symbol_space>"));
  defMethod('list', 0, thisObj => makeListObj(thisObj.indexedTable.values().toArray()));
  defMethod('find_by_name', 1, (thisObj, args) => findSymbolByName((args[0] as StringObj).value, thisObj)!);
  defMethod('find_by_id', 1, (thisObj, args) => findSymbolById((args[0] as IntObj).value, thisObj)!);
  defMethod('intern', 1, (_, args) => k.intern((args[0] as StringObj).value));
}

// Use after bootstrap when symbolTypeObj is set
export function intern(symbolName: string, space: SymbolSpaceObj, symbolTypeObj: SymbolTypeObj): SymbolObj {
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

export function findSymbolByName(symbolName: string, space: SymbolSpaceObj) {
  return space.namedTable.get(symbolName) ?? null;
}

export function findSymbolById(symbolId: SymbolId, space: SymbolSpaceObj) {
  return space.indexedTable.get(symbolId) ?? null;
}