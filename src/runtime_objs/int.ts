import { findSymbol, type Env } from "../env";
import { assertObj } from "../util";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: number,
  }

export function makeIntTypeObj(env: Env): IntTypeObj {
  const rootTypeObj = findSymbol(env, 'type')?.value;
  assertObj<RootTypeObj>(rootTypeObj, 'RootTypeObj');

  return {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    methods: new Map(),
  };
}

export function makeIntObj(value: number, env: Env): IntObj {
  const intTypeObj = findSymbol(env, 'int')?.value;
  assertObj<IntTypeObj>(intTypeObj, 'IntTypeObj');

  return {
    tag: 'IntObj',
    type: intTypeObj,
    value,
  };
}
