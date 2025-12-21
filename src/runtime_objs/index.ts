import type { IntTypeObj, IntObj } from "./int";
import type { RootTypeObj } from "./root_type";
import type { SymbolTypeObj, SymbolObj } from "./symbol";

export type TypeObj = IntTypeObj | RootTypeObj | SymbolTypeObj;
export type RuntimeObj = IntObj | SymbolObj | TypeObj;
