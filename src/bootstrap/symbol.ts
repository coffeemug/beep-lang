import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { BeepKernel } from "./bootload";

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    id: number,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name' | 'bindingModule'> {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
    ownMethods: new Map(),
  };
}

export function makeSymbolObj(name: string, id: number, symbolTypeObj: SymbolTypeObj): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    id,
  };
}

export function initSymbolMethods(k: BeepKernel) {
  const { makeDefNative, makeStringObj, symbolTypeObj } = k;

  const defMethod = makeDefNative<SymbolObj>(k.kernelModule.toplevelScope, symbolTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(`${thisObj.name}:${thisObj.id}`));
}
