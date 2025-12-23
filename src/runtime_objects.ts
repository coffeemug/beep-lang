import type { IntTypeObj, IntObj } from "./data_structures/int";
import type { ListTypeObj, ListObj } from "./data_structures/list";
import type { MethodTypeObj, MethodObj } from "./core_objects/methods";
import type { ModuleTypeObj, ModuleObj } from "./core_objects/module";
import type { RootTypeObj } from "./core_objects/root_type";
import type { StringTypeObj, StringObj } from "./data_structures/string";
import type { SymbolTypeObj, SymbolObj } from "./core_objects/symbol";

export type TypeObj = IntTypeObj | ListTypeObj | ModuleTypeObj | RootTypeObj | SymbolTypeObj | MethodTypeObj | StringTypeObj;
export type RuntimeObj = IntObj | ListObj | ModuleObj | SymbolObj | MethodObj | StringObj | TypeObj;
