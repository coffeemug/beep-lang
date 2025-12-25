import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { BeepKernel } from "../bootstrap/kernel";

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
  const { makeUnboundNativeMethodObj, makeStringObj, symbolTypeObj, intern } = k;
  const scope = k.sysModule.toplevelScope;

  makeUnboundNativeMethodObj<SymbolObj>(scope, symbolTypeObj, intern('show'), 0, thisObj =>
    makeStringObj(`${thisObj.name}:${thisObj.id}`));
}
