import type { RuntimeObj } from ".";
import { findSymbol, type Env } from "../env";
import { assertObj } from "../util";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    value: RuntimeObj | null,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): SymbolTypeObj {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
  };
}

export function makeSymbolObj_(name: string, symbolTypeObj: SymbolTypeObj, value: RuntimeObj | null = null): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    value,
  };
}

export function makeSymbolObj(name: string, env: Env): SymbolObj {
  const symbolTypeObj = findSymbol(env, 'symbol')?.value;
  assertObj<SymbolTypeObj>(symbolTypeObj, 'SymbolTypeObj');

  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    value: null,
  };
}
