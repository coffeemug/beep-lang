import type { Expr } from "./parser";
import type { RuntimeObj } from "./runtime_objs";
import { makeIntObj, type IntTypeObj } from "./runtime_objs/int";
import { findBinding, intern, type Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      // TODO: interpreter should cache types to avoid reinterning
      const intSym = intern(env, 'int');
      const intType = findBinding(env, intSym) as IntTypeObj;
      return makeIntObj(expr.value, intType);
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
  }

  const _exhaustive: never = obj;
}
