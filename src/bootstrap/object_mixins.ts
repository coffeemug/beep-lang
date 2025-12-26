import type { TypeObj } from "../runtime_objects";
import type { UnboundMethodObj } from "./unbound_method";
import type { SymbolObj } from "./symbol";
import type { BoundMethodObj } from "./bound_method";

export type RuntimeObjMixin<Tag extends string, T extends TypeObj> = {
  /* Fields common to every runtime object */
  tag: Tag,
  type: T,
}

export type TypeObjMixin = {
  /* Fields common to every type object */
  name: SymbolObj,
  methods: UnboundMethodsMap,
  ownMethods: BoundMethodsMap,
}

export type UnboundMethodsMap = Map<SymbolObj, UnboundMethodObj>;
export type BoundMethodsMap = Map<SymbolObj, BoundMethodObj>;
