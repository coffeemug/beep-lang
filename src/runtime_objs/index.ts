import type { IntTypeObj, IntObj } from "./int";
import type { ListTypeObj, ListObj } from "./list";
import type { MethodTypeObj, MethodObj } from "./methods";
import type { ModuleTypeObj, ModuleObj } from "./module";
import type { RootTypeObj } from "./root_type";
import type { StringTypeObj, StringObj } from "./string";
import type { SymbolTypeObj, SymbolObj } from "./symbol";

export type TypeObj = IntTypeObj | ListTypeObj | ModuleTypeObj | RootTypeObj | SymbolTypeObj | MethodTypeObj | StringTypeObj;
export type RuntimeObj = IntObj | ListObj | ModuleObj | SymbolObj | MethodObj | StringObj | TypeObj;
