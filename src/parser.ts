import { int, eof, seq, either, alpha, alnum, many, lex, fwd, sepBy, type parser, type parserlike } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import { intern, type Env } from "./env";
import type { SymbolObj } from "./runtime_objs/symbol";

function postfix<B, S, R>(
  base: parserlike<B>,
  suffix: parserlike<S>,
  fold: (acc: B | R, suf: S) => R
): parser<B | R> {
  return seq(base, many(suffix)).map(([b, suffixes]) =>
    suffixes.reduce<B | R>(fold, b)
  );
}

export type Expr =
  | { type: "int"; value: number }
  | { type: "ident"; sym: SymbolObj }
  | { type: "methodDef"; receiverType: SymbolObj; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "fieldAccess"; receiver: Expr; fieldName: SymbolObj }
  | { type: "funcall"; fn: Expr; args: Expr[] };

type Suffix =
  | { type: "fieldAccess"; name: SymbolObj }
  | { type: "funcall"; args: Expr[] };

export function parse(input: string, env: Env): Expr {
  // Identifiers and symbols
  const identSym = lex(seq(alpha, many(alnum))).map(([first, rest]) => {
    const name = [first, ...rest].join("");
    return intern(env, name);
  });

  const ident = identSym.map((sym) => ({ type: "ident" as const, sym }));

  // Integer literals
  const intLit = int.map((n) => ({ type: "int" as const, value: n }));

  // Primary expressions (atoms)
  const primary = either(intLit, ident);

  // Forward reference for full expressions (needed for method bodies and args)
  const expr: parser<Expr> = fwd(() => postfixExpr);

  // Method definition: def type/name(params) body end
  const methodDef = seq(
    "def", identSym, "/", identSym, "(", sepBy(identSym, ","), ")",
    expr,
    "end"
  ).map(([_def, receiverType, _slash, name, _lp, params, _rp, body, _end]): Expr => ({
    type: "methodDef" as const,
    receiverType,
    name,
    params,
    body,
  }));

  // Suffix: (args) for funcall
  const funcallSuffix = seq(
    "(", sepBy(expr, ","), ")"
  ).map(([_lp, args, _rp]): Suffix => ({
    type: "funcall",
    args,
  }));

  // Suffix: .name for field access
  const fieldAccessSuffix = seq(".", identSym).map(([_dot, name]): Suffix => ({
    type: "fieldAccess",
    name,
  }));

  // Postfix operators: .name and (args)
  const postfixExpr = postfix(
    either(methodDef, primary),
    either(funcallSuffix, fieldAccessSuffix),
    (acc, suf): Expr => {
      if (suf.type === "fieldAccess") {
        return { type: "fieldAccess", receiver: acc, fieldName: suf.name };
      } else {
        return { type: "funcall", fn: acc, args: suf.args };
      }
    }
  );

  const topLevel = seq(expr, eof).map(([e, _]) => e);

  const stream = fromString(input);
  const result = topLevel(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
