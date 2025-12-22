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

export function makeIntTypeObj(rootTypeObj: RootTypeObj): IntTypeObj {
  return {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    methods: new Map(),
  };
}

export function makeIntObj(value: number, intTypeObj: IntTypeObj): IntObj {
  return {
    tag: 'IntObj',
    type: intTypeObj,
    value,
  };
}
