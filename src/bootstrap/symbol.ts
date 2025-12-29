import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { BeepKernel } from "./bootload";
import type { SymbolId } from "./symbol_space";

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    id: SymbolId,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name' | 'bindingModule'> {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
    ownMethods: new Map(),
  };
}

export function makeSymbolObj(name: string, id: SymbolId, symbolTypeObj: SymbolTypeObj): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    id,
  };
}

export function initSymbolMethods(k: BeepKernel) {
  const { makeDefNative, makeStringObj, makeIntObj, symbolTypeObj } = k;

  const defMethod = makeDefNative<SymbolObj>(k.kernelModule.toplevelScope, symbolTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(`${thisObj.name}`));
  defMethod('id', 0, thisObj => makeIntObj(thisObj.id));
}
