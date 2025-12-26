import type { IntTypeObj, IntObj } from "./data_structures/int";
import type { ListTypeObj, ListObj } from "./data_structures/list";
import type { UnboundMethodTypeObj, UnboundMethodObj } from "./core_objects/unbound_method";
import type { ModuleTypeObj, ModuleObj } from "./core_objects/module";
import type { RootTypeObj } from "./core_objects/root_type";
import type { StringTypeObj, StringObj } from "./data_structures/string";
import type { SymbolTypeObj, SymbolObj } from "./core_objects/symbol";
import type { BoundMethodObj, BoundMethodTypeObj } from "./core_objects/bound_method";
import type { ScopeTypeObj, ScopeObj } from "./runtime/scope";

export type TypeObj =
  IntTypeObj | ListTypeObj | ModuleTypeObj | RootTypeObj | SymbolTypeObj
  | UnboundMethodTypeObj | BoundMethodTypeObj | StringTypeObj | ScopeTypeObj;

export type RuntimeObj =
  IntObj | ListObj | ModuleObj | SymbolObj | UnboundMethodObj
  | BoundMethodObj | StringObj | ScopeObj | TypeObj;
