import type { Expr } from "./parser";
import type { RuntimeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import { findBinding, type Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      return makeIntObj(expr.value, env.cachedIntTypeObj.deref()!);
    }
    case 'ident': {
      const value = findBinding(env, expr.sym);
      if (!value) {
        throw new Error(`Unbound symbol ${print(expr.sym)}`);
      }
      return value;
    }
  }

  const _exhaustive: never = expr;
}

export function print(obj: RuntimeObj): string {
  switch (obj.tag) {
    case 'IntObj':
      return obj.value.toString();
    case 'IntTypeObj':
      return '<type int>';
    case 'RootTypeObj':
      return '<type type>';
    case 'SymbolObj':
      return `'${obj.name}:${obj.id}`;
    case 'SymbolTypeObj':
      return '<type symbol>';
    case 'MethodObj':
      return `TODO:receiverTypeName/${obj.name.name}`;
    case "MethodTypeObj":
      return '<type method>';
  }

  const _exhaustive: never = obj;
}
