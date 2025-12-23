import type { TypeObj } from "../runtime_objects";
import type { MethodObj } from "./methods";
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
  methods: MethodsMap,
  bindingModule: ModuleObj,
}

export type MethodsMap = Map<SymbolObj, MethodObj>;
