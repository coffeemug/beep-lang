import { int, eof, seq, either, alpha, alnum, many, lex } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import { intern, type Env } from "./env";
import type { SymbolObj } from "./runtime_objs/symbol";

export type Expr =
  | { type: "int"; value: number }
  | { type: "ident"; sym: SymbolObj };

export function parse(input: string, env: Env): Expr {
  const ident = lex(seq(alpha, many(alnum))).map(([first, rest]) => {
    const name = [first, ...rest].join("");
    const sym = intern(env, name);
    return { type: "ident" as const, sym };
  });

  const intLit = int.map((n) =>
    ({ type: "int" as const, value: n }));

  const expr = seq(either(intLit, ident), eof).map(([e, _]) => e);

  const stream = fromString(input);
  const result = expr(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
