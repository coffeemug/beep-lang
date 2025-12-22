import type { TypeObj } from ".";
import type { Frame } from "../env";
import type { Expr } from "../parser";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import type { SymbolObj } from "./symbol";

export type MethodTypeObj =
  & RuntimeObjMixin<'MethodTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type MethodObj =
  & RuntimeObjMixin<'MethodObj', MethodTypeObj>
  & {
    receiverType: TypeObj,
    name: SymbolObj,
    argNames: SymbolObj[],
    body: Expr,
    closureFrame: Frame,
  }

export function makeMethodTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): MethodTypeObj {
  return {
    tag: 'MethodTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeMethodObj(receiverType: TypeObj, name: SymbolObj, argNames: SymbolObj[], body: Expr, methodTypeObj: MethodTypeObj, closureFrame: Frame): MethodObj {
  return {
    tag: 'MethodObj',
    type: methodTypeObj,
    receiverType,
    name,
    argNames,
    body,
    closureFrame,
  };
}
