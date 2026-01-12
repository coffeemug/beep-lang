import { int, eof, seq, either, alpha, alnum, many, lex, lexMode, fwd, sepBy, sepBy1, anych, maybe, some, not, peek, binop, str, type parser, type parserlike, noop, err, toParser } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import type { SymbolObj } from "../bootstrap/symbol";
import { isAssignable, type Pattern } from "./pattern";

const identFirstChar = either(alpha, "_");
const identChar = either(alnum, "_");
const ident = lex(seq(identFirstChar, many(identChar))).map(([first, rest]) =>
  [first, ...rest].join(""));
export const symbolName = lex(seq(ident, maybe(either("!", "?")))).map(([name, suffix]) =>
  name + (suffix ?? ""));

const xsep = <T>(p: parserlike<T>) =>
  lexMode("keep_newlines", either(some("\n"), seq(p, peek(not("\n")))).map(_ => {}));

function postfix<B, S, R>(
  base: parserlike<B>,
  suffix: parserlike<S>,
  fold: (acc: B | R, suf: S) => R
): parser<B | R> {
  return seq(base, many(suffix)).map(([b, suffixes]) =>
    suffixes.reduce<B | R>(fold, b)
  );
}

export type ListElement =
  | { kind: "value"; expr: Expr }
  | { kind: "spread"; expr: Expr };

export type MapElement =
  | { kind: "pair"; key: SymbolObj; value: Expr }
  | { kind: "spread"; expr: Expr };

export type Expr =
  | { type: "int"; value: bigint }
  | { type: "string"; value: string }
  | { type: "quotedSymbol"; sym: SymbolObj }
  | { type: "list"; elements: ListElement[] }
  | { type: "map"; pairs: MapElement[] }
  | { type: "lexicalVar"; sym: SymbolObj }
  | { type: "dynamicVar"; sym: SymbolObj }
  | { type: "memberVar"; fieldName: SymbolObj }
  | { type: "methodDef"; receiverType: SymbolObj; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "functionDef"; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "fieldAccess"; receiver: Expr; fieldName: SymbolObj }
  | { type: "indexAccess"; receiver: Expr; index: Expr }
  | { type: "funcall"; fn: Expr; args: Expr[] }
  | { type: "block"; exprs: Expr[] }
  | { type: "let"; pattern: Pattern; value: Expr }
  | { type: "assign"; target: Pattern; value: Expr }
  | { type: "indexAssign"; receiver: Expr; index: Expr; value: Expr }
  | { type: "fieldAssign"; receiver: Expr; fieldName: SymbolObj; value: Expr }
  | { type: "memberAssign"; fieldName: SymbolObj; value: Expr }
  | { type: "structDef"; name: SymbolObj; fields: SymbolObj[] }
  | { type: "prototypeDef"; name: SymbolObj }
  | { type: "binOp"; op: string; left: Expr; right: Expr }
  | { type: "for"; binding: Pattern; iterable: Expr; body: Expr }
  | { type: "while"; cond: Expr; body: Expr }
  | { type: "range"; start: Expr; end: Expr; mode: 'exclusive' | 'inclusive' }
  | { type: "if"; branches: { cond: Expr; body: Expr }[]; else_: Expr | null }
  | { type: "use"; path: string; alias: string | null }
  | { type: "useNames"; path: string; names: { name: string; alias: string | null }[] }
  | { type: "mixInto"; prototype: SymbolObj; target: SymbolObj }
  | { type: "lambda"; params: SymbolObj[]; body: Expr }
  | { type: "not"; expr: Expr }
  | { type: "case"; subject: Expr; branches: { pattern: Pattern; body: Expr }[] }
  | { type: "break"; value: Expr | null }
  | { type: "return"; value: Expr | null };

type Suffix =
  | { type: "fieldAccess"; name: SymbolObj }
  | { type: "indexAccess"; index: Expr }
  | { type: "funcall"; args: Expr[] };

export function parse(input: string, intern: (name: string) => SymbolObj): Expr {
  /*
    Identifiers and symbols
  */
  const symbol = symbolName.map(intern);

  /*
    Variables
  */
  const keyword = (kw: string) => lex(lexMode("keep_all", seq(kw, peek(not(identChar)))).map(([k, _]) => k));
  const reserved = either(keyword("def"), keyword("end"), keyword("let"), keyword("struct"), keyword("proto"), keyword("for"), keyword("while"), keyword("in"), keyword("do"), keyword("and"), keyword("or"), keyword("if"), keyword("then"), keyword("else"), keyword("elif"), keyword("use"), keyword("as"), keyword("mix"), keyword("into"), keyword("case"), keyword("break"), keyword("return"));

  const lexicalVar = lex(seq(peek(not(reserved)), symbol))
    .map(([_, sym]) => ({ type: "lexicalVar" as const, sym }));

  const dynamicVar = lex(seq("$", symbol))
    .map(([_dollar, sym]) => ({ type: "dynamicVar" as const, sym }));

  const memberVar = lex(seq("@", symbol))
    .map(([_at, sym]) => ({ type: "memberVar" as const, fieldName: sym }));

  /*
    Forward declare expressions
  */
  const expr: parser<Expr> = fwd(() => orExpr);

  /*
    Literals
  */
  const intLit = int.map((n) => ({ type: "int" as const, value: n }));

  const strLit = lex(seq("'", many(anych({ but: "'" })), "'"))
    .map(([_q1, chars, _q2]) => ({ type: "string" as const, value: chars.join("") }));

  const quotedSymbol = either(
    seq(":", strLit).map(([_, str]) => ({ type: "quotedSymbol" as const, sym: intern(str.value) })),
    seq(":", symbol).map(([_colon, sym]) => ({ type: "quotedSymbol" as const, sym }))
  );

  const spread = seq("...", expr).map(([_, e]) => ({ kind: "spread" as const, expr: e }));

  const listElement = either(
    spread,
    expr.map((e): ListElement => ({ kind: "value", expr: e }))
  );
  const listLit = seq("[", sepBy(listElement, ","), "]")
    .map(([_lb, elements, _rb]) => ({ type: "list" as const, elements }));

  const mapPair = seq(symbol, ":", expr)
    .map(([key, _colon, value]): MapElement => ({ kind: "pair", key, value }));
  const mapElement = either(spread, mapPair);
  const mapLit = seq("{", sepBy(mapElement, ","), "}")
    .map(([_lb, pairs, _rb]) => ({ type: "map" as const, pairs }));

  const parenExpr = seq("(", expr, ")").map(([_lp, e, _rp]) => e);

  // Lambda expressions: \x => expr, \x, y => expr, \ => expr
  const lambdaBody: parser<Expr> = fwd(() => either(
    seq("do", block_, "end").map(([_do, body, _end]) => body),
    expr
  ));
  const lambdaExpr = seq("\\", sepBy(symbol, ","), "=>", lambdaBody)
    .map(([_backslash, params, _arrow, body]): Expr => ({
      type: "lambda",
      params,
      body,
    }));

  const primary = either(
    lambdaExpr, parenExpr, mapLit, listLit, quotedSymbol, strLit, intLit,
    memberVar, dynamicVar, lexicalVar);

  /*
    Definitions
  */
  const arglist = seq("(", sepBy(symbol, ","), ")").map(([_lp, params, _rp]) => params);
  const fnBody = fwd(() => block(noop, "end"));

  const methodDef = seq("def", symbol, "/", symbol, arglist, fnBody)
    .map(([_def, receiverType, _slash, name, params, body]): Expr => ({
      type: "methodDef" as const,
      receiverType,
      name,
      params,
      body,
    }));

  const functionDef = seq(keyword("def"), symbol, arglist, fnBody)
    .map(([_def, name, params, body]): Expr => ({
      type: "functionDef" as const,
      name,
      params,
      body,
    }));

  const structDef = seq(keyword("struct"), symbol, sepBy(symbol, ","), "end")
    .map(([_struct, name, fields, _end]): Expr => ({
      type: "structDef" as const,
      name,
      fields,
    }));

  const prototypeDef = seq(keyword("proto"), symbol)
    .map(([_prototype, name]): Expr => ({
      type: "prototypeDef" as const,
      name,
    }));

  // use foo/bar/baz
  // use foo/bar/baz as alias
  // use foo/bar/baz/[sin, cos as c]
  const useStatement = seq("use", lex(sepBy1(ident, "/", "leave")), fwd(() => useSuffix))
    .map(([_use, parts, toExpr]) => toExpr(parts.join("/")));

  const useSuffix = either(
    seq("as", ident).map(([_, alias]) => (path: string): Expr => ({ type: "use", path, alias })),
    seq("/", fwd(() => useImportList)).map(([_, names]) => (path: string): Expr => ({ type: "useNames", path, names })),
    noop.map(() => (path: string): Expr => ({ type: "use", path, alias: null })),
  );
  
  const useImportList = seq("[", sepBy1(fwd(() => useImport), ","), "]")
    .map(([_lb, names, _rb]) => names);
  
  const useImport = either(
    seq(ident, "as", ident).map(([name, _, alias]) => ({ name, alias })),
    ident.map(name => ({ name, alias: null }))
  );

  // mix foo into bar
  const mixIntoStatement = seq(lex(keyword("mix")), symbol, lex(keyword("into")), symbol)
    .map(([_mix, prototype, _into, target]): Expr => ({
      type: "mixInto",
      prototype,
      target,
    }));

  const definition = either(methodDef, functionDef, structDef, prototypeDef);

  /*
    Compound expressions
  */
  const funcallSuffix = seq(
    "(", sepBy(expr, ","), ")"
  ).map(([_lp, args, _rp]): Suffix => ({
    type: "funcall",
    args,
  }));

  const fieldAccessSuffix = seq(".", symbol).map(([_dot, name]): Suffix => ({
    type: "fieldAccess",
    name,
  }));

  const indexAccessSuffix = seq(lexMode("keep_newlines", seq(peek(not("\n")), "[")), expr, "]").map(([_lb, index, _rb]): Suffix => ({
    type: "indexAccess",
    index,
  }));

  const postfixExpr = postfix(
    primary,
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

  // Unary not: !expr
  const notExpr: parser<Expr> = fwd(() => either(
    seq("!", notExpr).map(([_, e]): Expr => ({ type: "not", expr: e })),
    postfixExpr
  ));

  const mulExpr = binop(
    str("*"),
    notExpr,
    (op, left, right): Expr => ({ type: "binOp", op, left, right })
  );

  const addSubExpr = binop(
    either(str("+"), str("-")),
    mulExpr,
    (op, left, right): Expr => ({ type: "binOp", op, left, right })
  );

  const modExpr = binop(
    str("%"),
    addSubExpr,
    (op, left, right): Expr => ({ type: "binOp", op, left, right })
  );

  const rangeExpr = binop(
    either(str("..="), str("..")),
    modExpr,
    (op, start, end): Expr => ({
      type: "range",
      start,
      end,
      mode: op === ".." ? 'exclusive' : 'inclusive'
    })
  );

  const orderingExpr = binop(
    either(str("<="), str(">="), str("<"), str(">")),
    rangeExpr,
    (op, left, right): Expr => ({ type: "binOp", op, left, right })
  );

  const comparisonExpr = binop(
    str("=="),
    orderingExpr,
    (op, left, right): Expr => ({ type: "binOp", op, left, right })
  );

  const andExpr = binop(
    lex(keyword("and")),
    comparisonExpr,
    (_op, left, right): Expr => ({ type: "binOp", op: "and", left, right })
  );

  const orExpr = binop(
    lex(keyword("or")),
    andExpr,
    (_op, left, right): Expr => ({ type: "binOp", op: "or", left, right })
  );

  /*
    Statements
  */
  const vardecl: parser<Expr> = fwd(() =>
    seq("let", assignablePattern, "=", expr).map(([_let, pat, _, value]): Expr =>
      ({ type: "let", pattern: pat, value })));

  const assign: parser<Expr> = fwd(() =>
    seq(assignablePattern, "=", expr).map(([target, _, value]): Expr =>
      ({ type: "assign", target, value })));

  // Index assignment: obj[index] = value
  const indexAssign = seq(primary, "[", expr, "]", "=", expr)
    .map(([receiver, _lb, index, _rb, _eq, value]): Expr => ({
      type: "indexAssign", receiver, index, value
    }));

  // Field assignment: obj.field = value
  const fieldAssign = seq(primary, ".", symbol, "=", expr)
    .map(([receiver, _dot, fieldName, _eq, value]): Expr => ({
      type: "fieldAssign", receiver, fieldName, value
    }));

  // Member assignment: @field = value
  const memberAssign = seq(memberVar, "=", expr)
    .map(([member, _eq, value]): Expr => ({
      type: "memberAssign", fieldName: member.fieldName, value
    }));


  const lexicalBlock = fwd(() => block("do", "end"));

  const forLoop: parser<Expr> = fwd(() => seq(
    "for", assignablePattern, "in", expr,
    block(xsep("do"), "end")
  ).map(([_for, binding, _in, iterable, body]): Expr =>
    ({ type: "for", binding, iterable, body })));

  const whileLoop = seq(
    "while", expr,
    fwd(() => block(xsep("do"), "end"))
  ).map(([_while, cond, body]): Expr => ({
    type: "while",
    cond,
    body,
  }));

  const ifBody = fwd(() => block(xsep("then"), peek(lex(either(keyword("elif"), keyword("else"), keyword("end"))))));

  type IfContinuation = { type: 'elif'; cond: Expr; body: Expr; cont: IfContinuation }
                      | { type: 'else'; body: Expr }
                      | { type: 'end' };

  const ifContinuation: parser<IfContinuation> = fwd(() => either(
    seq(lex("elif"), expr, ifBody, ifContinuation).map(([_, cond, body, cont]): IfContinuation => ({ type: 'elif', cond, body, cont })),
    seq(lex("else"), fwd(() => block(noop, "end"))).map(([_, body]): IfContinuation => ({ type: 'else', body })),
    lex("end").map((): IfContinuation => ({ type: 'end' }))
  ));

  const ifStatement = seq("if", expr, ifBody, ifContinuation)
    .map(([_if, cond, body, cont]): Expr => {
      const branches: { cond: Expr; body: Expr }[] = [{ cond, body }];
      let else_: Expr | null = null;
      let current = cont;
      while (current.type === 'elif') {
        branches.push({ cond: current.cond, body: current.body });
        current = current.cont;
      }
      if (current.type === 'else') {
        else_ = current.body;
      }
      return { type: "if", branches, else_ };
    });

  /*
    Pattern matching
  */
  const wildcardPattern = lex("_").map((): Pattern => ({ type: "wildcard" }));
  const symbolPattern = quotedSymbol.map((qs): Pattern => ({ type: "symbol", sym: qs.sym }));
  const intPattern = intLit.map((lit): Pattern => ({ type: "int", value: lit.value }));
  const stringPattern = strLit.map((lit): Pattern => ({ type: "string", value: lit.value }));
  const dynamicBindingPattern = lex(seq("$", symbol))
    .map(([_, sym]): Pattern => ({ type: "binding", sym, scope: 'dynamic' }));
  const lexicalBindingPattern = lex(seq(peek(not(reserved)), symbol))
    .map(([_, sym]): Pattern => ({ type: "binding", sym, scope: 'lexical' }));
  const listPattern: parser<Pattern> = fwd(() =>
    seq("[", sepBy(pattern, ","), "]").map(([_, elements, __]): Pattern => ({ type: "list", elements })));
  const pattern: parser<Pattern> = fwd(() =>
    either(wildcardPattern, listPattern, symbolPattern, intPattern, stringPattern, dynamicBindingPattern, lexicalBindingPattern));

  const assignablePattern: parser<Pattern> = toParser((source) => {
    const result = pattern(source);
    if (result.type === 'err') return result;
    if (!isAssignable(result.res)) {
      return err(source.row, source.col, "Cannot bind to literal pattern");
    }
    return result;
  });

  const caseBody: parser<Expr> = fwd(() => either(
    block(lex("do"), "end"),
    expr
  ));
  const caseBranch = seq(pattern, lex("=>"), caseBody)
    .map(([pat, _, body]) => ({ pattern: pat, body }));
  const caseStatement = seq("case", expr, xsep(noop), some(caseBranch), "end")
    .map(([_case, subject, _sep, branches, _end]): Expr => ({ type: "case", subject, branches }));

  const breakStatement = seq(keyword("break"), maybe(expr))
    .map(([_, value]): Expr => ({ type: "break", value: value ?? null }));

  const returnStatement = seq(keyword("return"), maybe(expr))
    .map(([_, value]): Expr => ({ type: "return", value: value ?? null }));

  const statement = either(breakStatement, returnStatement, caseStatement, ifStatement, forLoop, whileLoop, vardecl, indexAssign, fieldAssign, memberAssign, assign, lexicalBlock);

  /*
    Blocks
  */
  const clause: parser<Expr> = either(statement, expr);

  const block_ = maybe(seq(clause, many(seq(xsep(";"), clause).map(([_, e]) => e))))
    .map((result): Expr => {
      if (!result) return { type: "block", exprs: [] };
      const [first, rest] = result;
      return { type: "block", exprs: [first, ...rest] };
    });

  const block = <B, E>(begin: parserlike<B>, end: parserlike<E>) =>
    seq(begin, block_, end).map(([_1, b, _2]) => b);

  /*
    Top-level
  */
  const topLevelClause: parser<Expr> = either(useStatement, mixIntoStatement, definition, statement, expr);
  const topLevel = seq(sepBy(topLevelClause, xsep(";")), eof).map(([exprs, _]): Expr =>
    exprs.length === 1 ? exprs[0] : { type: "block", exprs });

  const stream = fromString(input);
  const result = topLevel(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
