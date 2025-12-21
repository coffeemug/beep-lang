import { int, eof, seq } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";

export type Expr = { type: "int"; value: number };

const expr = seq(int, eof).map(([n, _]) =>
  ({ type: "int" as const, value: n }));

export function parse(input: string): Expr {
  const stream = fromString(input);
  const result = expr(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
