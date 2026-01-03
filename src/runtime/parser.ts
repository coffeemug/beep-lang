import { int, eof, seq, either, alpha, alnum, many, lex, lexMode, fwd, sepBy, sepBy1, anych, maybe, some, not, peek, type parser, type parserlike } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import type { SymbolObj } from "../bootstrap/symbol";

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
  | { type: "int"; value: bigint }
  | { type: "string"; value: string }
  | { type: "symbol"; sym: SymbolObj }
  | { type: "list"; elements: Expr[] }
  | { type: "map"; pairs: { key: SymbolObj; value: Expr }[] }
  | { type: "ident"; sym: SymbolObj }
  | { type: "dynamicIdent"; sym: SymbolObj }
  | { type: "memberField"; fieldName: SymbolObj }
  | { type: "methodDef"; receiverType: SymbolObj; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "functionDef"; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "fieldAccess"; receiver: Expr; fieldName: SymbolObj }
  | { type: "indexAccess"; receiver: Expr; index: Expr }
  | { type: "funcall"; fn: Expr; args: Expr[] }
  | { type: "block"; exprs: Expr[] }
  | { type: "let"; bindings: { name: SymbolObj; value: Expr; scope: 'lexical' | 'dynamic' }[] }
  | { type: "assign"; target: { name: SymbolObj; scope: 'lexical' | 'dynamic' }; value: Expr }
  | { type: "structDef"; name: SymbolObj; fields: SymbolObj[] };

type Suffix =
  | { type: "fieldAccess"; name: SymbolObj }
  | { type: "indexAccess"; index: Expr }
  | { type: "funcall"; args: Expr[] };

export function parse(input: string, intern: (name: string) => SymbolObj): Expr {
  // Identifier character: alphanumeric or underscore
  const identFirstChar = either(alpha, "_");
  const identChar = either(alnum, "_");

  // Identifiers and symbols
  const identSym = lex(seq(identFirstChar, many(identChar))).map(([first, rest]) => {
    const name = [first, ...rest].join("");
    return intern(name);
  });

  // Method names can have an optional ! at the end (e.g., push!)
  const methodNameSym = lex(seq(identFirstChar, many(identChar), maybe("!"))).map(([first, rest, bang]) => {
    const name = [first, ...rest, bang ?? ""].join("");
    return intern(name);
  });

  // Reserved keywords that cannot be used as identifiers
  // Use lexMode to check word boundary before whitespace is dropped
  const keyword = (kw: string) => lexMode("keep_all", seq(kw, peek(not(identChar)))).map(([k, _]) => k);
  const reserved = either(keyword("def"), keyword("end"), keyword("let"), keyword("struct"));

  const ident = lex(seq(peek(not(reserved)), seq(identFirstChar, many(identChar))))
    .map(([_, [first, rest]]) => ({ type: "ident" as const, sym: intern(first + rest.join("")) }));

  // Dynamic identifier: $foo (lookup in dynamic scope)
  const dynamicIdent = lex(seq("$", identSym))
    .map(([_dollar, sym]) => ({ type: "dynamicIdent" as const, sym }));

  // This field access: @foo (equivalent to this.foo)
  const memberField = lex(seq("@", identSym))
    .map(([_at, sym]) => ({ type: "memberField" as const, fieldName: sym }));

  // Integer literals
  const intLit = int.map((n) => ({ type: "int" as const, value: n }));

  // String literals: 'foo bar'
  const strLit = lex(seq("'", many(anych({ but: "'" })), "'"))
    .map(([_q1, chars, _q2]) => ({ type: "string" as const, value: chars.join("") }));

  // Symbol literals: :foo
  const symLit = seq(":", identSym)
    .map(([_colon, sym]) => ({ type: "symbol" as const, sym }));

  // Forward reference for full expressions (needed for list elements, method bodies, and args)
  const expr: parser<Expr> = fwd(() => postfixExpr);

  // Forward reference for block (needed for function/method bodies)
  const body: parser<Expr> = fwd(() => block);

  // List literals: [elem, elem, ...]
  const listLit = seq("[", sepBy(expr, ","), "]")
    .map(([_lb, elements, _rb]) => ({ type: "list" as const, elements }));

  // Map literals: { key: value, ... }
  const mapPair = seq(identSym, ":", expr)
    .map(([key, _colon, value]) => ({ key, value }));
  const mapLit = seq("{", sepBy(mapPair, ","), "}")
    .map(([_lb, pairs, _rb]) => ({ type: "map" as const, pairs }));

  // Primary expressions (atoms)
  const primary = either(mapLit, listLit, symLit, strLit, intLit, memberField, dynamicIdent, ident);

  // Shared: (params) body end
  const defBody = seq("(", sepBy(identSym, ","), ")", body, "end")
    .map(([_lp, params, _rp, b, _end]) => ({ params, body: b }));

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

  // Struct definition: struct name fields end
  const structDef = seq("struct", identSym, sepBy(identSym, ","), "end")
    .map(([_struct, name, fields, _end]): Expr => ({
      type: "structDef" as const,
      name,
      fields,
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
    either(structDef, methodDef, functionDef, primary),
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

  // Let expression: let x = 1 or let x = 1, y = 2 or let $x = 1 (dynamic)
  const letBinding = either(
    seq("$", identSym, "=", expr).map(([_, name, __, value]) => ({ name, value, scope: 'dynamic' as const })),
    seq(identSym, "=", expr).map(([name, _, value]) => ({ name, value, scope: 'lexical' as const }))
  );
  const letExpr = seq("let", sepBy1(letBinding, ",")).map(([_let, bindings]): Expr => ({
    type: "let",
    bindings,
  }));

  // Assignment: x = expr (lexical) or $x = expr (dynamic)
  const assignTarget = either(
    seq("$", identSym).map(([_, name]) => ({ name, scope: 'dynamic' as const })),
    ident.map(id => ({ name: id.sym, scope: 'lexical' as const }))
  );
  const assign = seq(assignTarget, "=", expr).map(([target, _, value]): Expr => ({
    type: "assign",
    target,
    value,
  }));

  // A block item is a let, assignment, or regular expression
  const blockItem: parser<Expr> = either(letExpr, assign, expr);

  // Block: multiple expressions separated by newlines or semicolons
  // - \n+ or ; separates expressions (but ; cannot be followed by \n)
  // Note: expressions are parsed in drop_all mode (whitespace insensitive),
  // but separators are parsed in keep_newlines mode to distinguish \n from space
  const semicolonSep = lexMode("keep_newlines", seq(";", peek(not("\n"))).map(([s, _]) => s));
  const separator = lexMode("keep_newlines", either(some("\n"), semicolonSep));

  const block = maybe(seq(blockItem, many(seq(separator, blockItem).map(([_, e]) => e))))
    .map((result): Expr => {
      if (!result) return { type: "block", exprs: [] };
      const [first, rest] = result;
      return { type: "block", exprs: [first, ...rest] };
    });

  const topLevel = seq(block, eof).map(([e, _]) => e);

  const stream = fromString(input);
  const result = topLevel(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
