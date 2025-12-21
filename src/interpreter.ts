import type { Expr } from "./parser";
import type { RuntimeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import type { Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int':
      return makeIntObj(expr.value, env);
  }

  const _exhaustive: never = expr.type;
}

export function print(obj: RuntimeObj): string {
  switch (obj.tag) {
    case 'IntObj':
      return obj.value.toString();
    case 'IntTypeObj':
      return '<type int>';
    case 'RootTypeObj':
      return '<type type>';
  }

  const _exhaustive: never = obj;
}
