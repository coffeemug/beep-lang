import { int, eof, seq, either, alpha, alnum, many, lex, lexMode, fwd, sepBy, sepBy1, anych, maybe, some, not, peek, binop, str, type parser, type parserlike, noop } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import type { SymbolObj } from "../bootstrap/symbol";

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

export type Expr =
  | { type: "int"; value: bigint }
  | { type: "string"; value: string }
  | { type: "quotedSymbol"; sym: SymbolObj }
  | { type: "list"; elements: Expr[] }
  | { type: "map"; pairs: { key: SymbolObj; value: Expr }[] }
  | { type: "lexicalVar"; sym: SymbolObj }
  | { type: "dynamicVar"; sym: SymbolObj }
  | { type: "memberVar"; fieldName: SymbolObj }
  | { type: "methodDef"; receiverType: SymbolObj; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "functionDef"; name: SymbolObj; params: SymbolObj[]; body: Expr }
  | { type: "fieldAccess"; receiver: Expr; fieldName: SymbolObj }
  | { type: "indexAccess"; receiver: Expr; index: Expr }
  | { type: "funcall"; fn: Expr; args: Expr[] }
  | { type: "block"; exprs: Expr[] }
  | { type: "let"; bindings: { name: SymbolObj; value: Expr; scope: 'lexical' | 'dynamic' }[] }
  | { type: "assign"; target: { name: SymbolObj; scope: 'lexical' | 'dynamic' }; value: Expr }
  | { type: "structDef"; name: SymbolObj; fields: SymbolObj[] }
  | { type: "binOp"; op: string; left: Expr; right: Expr }
  | { type: "for"; binding: SymbolObj; iterable: Expr; body: Expr }
  | { type: "range"; start: Expr; end: Expr; mode: 'exclusive' | 'inclusive' }
  | { type: "if"; branches: { cond: Expr; body: Expr }[]; else_: Expr | null };

type Suffix =
  | { type: "fieldAccess"; name: SymbolObj }
  | { type: "indexAccess"; index: Expr }
  | { type: "funcall"; args: Expr[] };

export function parse(input: string, intern: (name: string) => SymbolObj): Expr {
  /*
    Identifiers and symbols
  */
  const identFirstChar = either(alpha, "_");
  const identChar = either(alnum, "_");

  const ident = lex(seq(identFirstChar, many(identChar))).map(([first, rest]) =>
    [first, ...rest].join(""));

  const symbol = ident.map(intern);

  const methodNameSym = lex(seq(ident, maybe("!"))).map(([name, bang]) =>
    intern(name + (bang ?? "")));

  /*
    Variables
  */
  const keyword = (kw: string) => lexMode("keep_all", seq(kw, peek(not(identChar)))).map(([k, _]) => k);
  const reserved = either(keyword("def"), keyword("end"), keyword("let"), keyword("struct"), keyword("for"), keyword("in"), keyword("do"), keyword("and"), keyword("or"), keyword("if"), keyword("then"), keyword("else"), keyword("elif"));

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

  const quotedSymbol = seq(":", symbol)
    .map(([_colon, sym]) => ({ type: "quotedSymbol" as const, sym }));

  const listLit = seq("[", sepBy(expr, ","), "]")
    .map(([_lb, elements, _rb]) => ({ type: "list" as const, elements }));

  const mapPair = seq(symbol, ":", expr)
    .map(([key, _colon, value]) => ({ key, value }));
  const mapLit = seq("{", sepBy(mapPair, ","), "}")
    .map(([_lb, pairs, _rb]) => ({ type: "map" as const, pairs }));

  const primary = either(
    mapLit, listLit, quotedSymbol, strLit, intLit,
    memberVar, dynamicVar, lexicalVar);

  /*
    Definitions
  */
  const arglist = seq("(", sepBy(symbol, ","), ")").map(([_lp, params, _rp]) => params);
  const fnBody = fwd(() => block(noop, "end"));

  const methodDef = seq("def", symbol, "/", methodNameSym, arglist, fnBody)
    .map(([_def, receiverType, _slash, name, params, body]): Expr => ({
      type: "methodDef" as const,
      receiverType,
      name,
      params,
      body,
    }));

  const functionDef = seq("def", methodNameSym, arglist, fnBody)
    .map(([_def, name, params, body]): Expr => ({
      type: "functionDef" as const,
      name,
      params,
      body,
    }));

  const structDef = seq("struct", symbol, sepBy(symbol, ","), "end")
    .map(([_struct, name, fields, _end]): Expr => ({
      type: "structDef" as const,
      name,
      fields,
    }));

  const definition = either(methodDef, functionDef, structDef);

  /*
    Compound expressions
  */
  const funcallSuffix = seq(
    "(", sepBy(expr, ","), ")"
  ).map(([_lp, args, _rp]): Suffix => ({
    type: "funcall",
    args,
  }));

  const fieldAccessSuffix = seq(".", methodNameSym).map(([_dot, name]): Suffix => ({
    type: "fieldAccess",
    name,
  }));

  const indexAccessSuffix = seq("[", expr, "]").map(([_lb, index, _rb]): Suffix => ({
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

  const mulExpr = binop(
    str("*"),
    postfixExpr,
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

  const comparisonExpr = binop(
    str("=="),
    rangeExpr,
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
  const letBinding = either(
    seq(dynamicVar, "=", expr).map(([v, _, value]) => ({ name: v.sym, value, scope: 'dynamic' as const })),
    seq(lexicalVar, "=", expr).map(([v, _, value]) => ({ name: v.sym, value, scope: 'lexical' as const }))
  );
  const vardecl = seq("let", sepBy1(letBinding, ",")).map(([_let, bindings]): Expr => ({
    type: "let",
    bindings,
  }));

  const assignTarget = either(
    dynamicVar.map(v => ({ name: v.sym, scope: 'dynamic' as const })),
    lexicalVar.map(v => ({ name: v.sym, scope: 'lexical' as const }))
  );
  const assign = seq(assignTarget, "=", expr).map(([target, _, value]): Expr => ({
    type: "assign",
    target,
    value,
  }));

  const lexicalBlock = fwd(() => block("do", "end"));

  const forLoop = seq(
    "for", symbol, "in", expr,
    fwd(() => block(xsep("do"), "end"))
  ).map(([_for, binding, _in, iterable, body]): Expr => ({
    type: "for",
    binding,
    iterable,
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

  const statement = either(ifStatement, forLoop, vardecl, assign, lexicalBlock);

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
  const topLevel = seq(either(definition, block(noop, noop)), eof).map(([e, _]) => e);

  const stream = fromString(input);
  const result = topLevel(stream);
  if (result.type === "err") {
    throw new Error(`Parse error at ${result.err.row}:${result.err.col}`);
  }
  return result.res;
}
