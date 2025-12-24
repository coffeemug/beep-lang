import type { TypeObj } from "../runtime_objects";
import type { UnboundMethodObj } from "./unbound_method";
import type { ModuleObj } from "./module";
import type { SymbolObj } from "./symbol";

export type RuntimeObjMixin<Tag extends string, T extends TypeObj> = {
  /* Fields common to every runtime object */
  tag: Tag,
  type: T,
}

export type TypeObjMixin = {
  /* Fields common to every type object */
  name: SymbolObj,
  methods: UnboundMethodsMap,
  bindingModule: ModuleObj,
}

export type UnboundMethodsMap = Map<SymbolObj, UnboundMethodObj>;
