import type { IntTypeObj, IntObj } from "./data_structures/int";
import type { ListTypeObj, ListObj } from "./data_structures/list";
import type { UnboundMethodTypeObj, UnboundMethodObj } from "./bootstrap/unbound_method";
import type { ModuleTypeObj, ModuleObj } from "./bootstrap/module";
import type { RootTypeObj } from "./bootstrap/root_type";
import type { StringTypeObj, StringObj } from "./data_structures/string";
import type { SymbolTypeObj, SymbolObj } from "./bootstrap/symbol";
import type { BoundMethodObj, BoundMethodTypeObj } from "./bootstrap/bound_method";
import type { ScopeTypeObj, ScopeObj } from "./bootstrap/scope";

export type TypeObj =
  IntTypeObj | ListTypeObj | ModuleTypeObj | RootTypeObj | SymbolTypeObj
  | UnboundMethodTypeObj | BoundMethodTypeObj | StringTypeObj | ScopeTypeObj;

export type RuntimeObj =
  IntObj | ListObj | ModuleObj | SymbolObj | UnboundMethodObj
  | BoundMethodObj | StringObj | ScopeObj | TypeObj;
