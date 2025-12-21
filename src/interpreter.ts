import type { Expr } from "./parser";
import type { RuntimeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import { intern, type Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int':
      return makeIntObj(expr.value, env);
    case 'ident': {
      const sym = intern(env, expr.name);
      if (!sym.value) {
        throw new Error(`Unbound symbol ${print(sym)}`);
      }
      return sym.value;
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
      return `:${obj.name}`;
    case 'SymbolTypeObj':
      return '<type symbol>';
  }

  const _exhaustive: never = obj;
}
