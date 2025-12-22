import type { IntTypeObj, IntObj } from "./int";
import type { MethodTypeObj, MethodObj } from "./methods";
import type { RootTypeObj } from "./root_type";
import type { SymbolTypeObj, SymbolObj } from "./symbol";

export type TypeObj = IntTypeObj | RootTypeObj | SymbolTypeObj | MethodTypeObj;
export type RuntimeObj = IntObj | SymbolObj | MethodObj | TypeObj;
