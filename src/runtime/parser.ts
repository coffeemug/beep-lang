import { int, eof, seq, either, alpha, alnum, many, lex, fwd, sepBy, anych, maybe, type parser, type parserlike } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import type { SymbolObj } from "../core_objects/symbol";

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
  | { type: "string"; value: string }
  | { type: "list"; elements: Expr[] }
  | { type: "ident"; sym: SymbolObj }
  | { type: "methodDef"; receiverType: SymbolObj; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "functionDef"; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "fieldAccess"; receiver: Expr; fieldName: SymbolObj }
  | { type: "indexAccess"; receiver: Expr; index: Expr }
  | { type: "funcall"; fn: Expr; args: Expr[] };

type Suffix =
  | { type: "fieldAccess"; name: SymbolObj }
  | { type: "indexAccess"; index: Expr }
  | { type: "funcall"; args: Expr[] };

export function parse(input: string, intern: (name: string) => SymbolObj): Expr {
  // Identifier character: alphanumeric or underscore
  const identChar = either(alnum, "_");

  // Identifiers and symbols
  const identSym = lex(seq(alpha, many(identChar))).map(([first, rest]) => {
    const name = [first, ...rest].join("");
    return intern(name);
  });

  // Method names can have an optional ! at the end (e.g., push!)
  const methodNameSym = lex(seq(alpha, many(identChar), maybe("!"))).map(([first, rest, bang]) => {
    const name = [first, ...rest, bang ?? ""].join("");
    return intern(name);
  });

  const ident = identSym.map((sym) => ({ type: "ident" as const, sym }));

  // Integer literals
  const intLit = int.map((n) => ({ type: "int" as const, value: n }));

  // String literals: 'foo bar'
  const strLit = lex(seq("'", many(anych({ but: "'" })), "'"))
    .map(([_q1, chars, _q2]) => ({ type: "string" as const, value: chars.join("") }));

  // Forward reference for full expressions (needed for list elements, method bodies, and args)
  const expr: parser<Expr> = fwd(() => postfixExpr);

  // List literals: [elem, elem, ...]
  const listLit = seq("[", sepBy(expr, ","), "]")
    .map(([_lb, elements, _rb]) => ({ type: "list" as const, elements }));

  // Primary expressions (atoms)
  const primary = either(listLit, strLit, intLit, ident);

  // Shared: (params) body end
  const defBody = seq("(", sepBy(identSym, ","), ")", expr, "end")
    .map(([_lp, params, _rp, body, _end]) => ({ params, body }));

  // Method definition: def type/name(params) body end
  const methodDef = seq("def", identSym, "/", methodNameSym, defBody)
    .map(([_def, receiverType, _slash, name, { params, body }]): Expr => ({
      type: "methodDef" as const,
      receiverType,
      name,
      params,
      body,
    }));

  // Function definition: def name(params) body end
  const functionDef = seq("def", methodNameSym, defBody)
    .map(([_def, name, { params, body }]): Expr => ({
      type: "functionDef" as const,
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
  const fieldAccessSuffix = seq(".", methodNameSym).map(([_dot, name]): Suffix => ({
    type: "fieldAccess",
    name,
  }));

  // Suffix: [expr] for index access
  const indexAccessSuffix = seq("[", expr, "]").map(([_lb, index, _rb]): Suffix => ({
    type: "indexAccess",
    index,
  }));

  // Postfix operators: .name, (args), and [index]
  const postfixExpr = postfix(
    either(methodDef, functionDef, primary),
    either(funcallSuffix, fieldAccessSuffix, indexAccessSuffix),
    (acc, suf): Expr => {
      if (suf.type === "fieldAccess") {
        return { type: "fieldAccess", receiver: acc, fieldName: suf.name };
      } else if (suf.type === "indexAccess") {
        return { type: "indexAccess", receiver: acc, index: suf.index };
      } else if (suf.type === "funcall") {
        return { type: "funcall", fn: acc, args: suf.args };
      }
      throw new Error("unreachable");
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
