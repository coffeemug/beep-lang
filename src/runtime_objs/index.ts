import type { IntTypeObj, IntObj } from "./int";
import type { RootTypeObj } from "./root_type";

export type TypeObj = IntTypeObj | RootTypeObj;
export type RuntimeObj = IntObj | TypeObj;
