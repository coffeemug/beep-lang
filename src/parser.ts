import { int, eof, seq, either, alpha, alnum, many, lex } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";

export type Expr =
  | { type: "int"; value: number }
  | { type: "ident"; name: string };

const ident = lex(seq(alpha, many(alnum))).map(([first, rest]) =>
  ({ type: "ident" as const, name: [first, ...rest].join("") }));

const intLit = int.map((n) =>
  ({ type: "int" as const, value: n }));

const expr = seq(either(intLit, ident), eof).map(([e, _]) => e);

export function parse(input: string): Expr {
  const stream = fromString(input);
  const result = expr(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
