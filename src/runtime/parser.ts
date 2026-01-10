import { int, eof, seq, either, alpha, alnum, many, lex, lexMode, fwd, sepBy, sepBy1, anych, maybe, some, not, peek, binop, str, type parser, type parserlike, noop } from "@spakhm/ts-parsec";
import { fromString } from "@spakhm/ts-parsec";
import type { SymbolObj } from "../bootstrap/symbol";

const identFirstChar = either(alpha, "_");
const identChar = either(alnum, "_");
const ident = lex(seq(identFirstChar, many(identChar))).map(([first, rest]) =>
  [first, ...rest].join(""));
export const symbolName = lex(seq(ident, maybe("!"))).map(([name, bang]) =>
  name + (bang ?? ""));

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
  | { type: "indexAssign"; receiver: Expr; index: Expr; value: Expr }
  | { type: "fieldAssign"; receiver: Expr; fieldName: SymbolObj; value: Expr }
  | { type: "memberAssign"; fieldName: SymbolObj; value: Expr }
  | { type: "structDef"; name: SymbolObj; fields: SymbolObj[] }
  | { type: "prototypeDef"; name: SymbolObj }
  | { type: "binOp"; op: string; left: Expr; right: Expr }
  | { type: "for"; binding: SymbolObj; iterable: Expr; body: Expr }
  | { type: "while"; cond: Expr; body: Expr }
  | { type: "range"; start: Expr; end: Expr; mode: 'exclusive' | 'inclusive' }
  | { type: "if"; branches: { cond: Expr; body: Expr }[]; else_: Expr | null }
  | { type: "use"; path: string; alias: string | null; force: boolean }
  | { type: "useNames"; path: string; names: { name: string; alias: string | null }[]; force: boolean }
  | { type: "mixInto"; prototype: SymbolObj; target: SymbolObj }
  | { type: "lambda"; params: SymbolObj[]; body: Expr }
  | { type: "not"; expr: Expr };

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
  const reserved = either(keyword("def"), keyword("end"), keyword("let"), keyword("struct"), keyword("proto"), keyword("for"), keyword("while"), keyword("in"), keyword("do"), keyword("and"), keyword("or"), keyword("if"), keyword("then"), keyword("else"), keyword("elif"), keyword("use"), keyword("as"), keyword("mix"), keyword("into"));

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

  const listLit = seq("[", sepBy(expr, ","), "]")
    .map(([_lb, elements, _rb]) => ({ type: "list" as const, elements }));

  const mapPair = seq(symbol, ":", expr)
    .map(([key, _colon, value]) => ({ key, value }));
  const mapLit = seq("{", sepBy(mapPair, ","), "}")
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
  // use! foo/bar/baz (force reload)
  const useStatement = seq(either("use!", "use"), lex(sepBy1(ident, "/", "leave")), fwd(() => useSuffix))
    .map(([useKw, parts, toExpr]) => toExpr(parts.join("/"), useKw === "use!"));

  const useSuffix = either(
    seq("as", ident).map(([_, alias]) => (path: string, force: boolean): Expr => ({ type: "use", path, alias, force })),
    seq("/", fwd(() => useImportList)).map(([_, names]) => (path: string, force: boolean): Expr => ({ type: "useNames", path, names, force })),
    noop.map(() => (path: string, force: boolean): Expr => ({ type: "use", path, alias: null, force })),
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

  const forLoop = seq(
    "for", symbol, "in", expr,
    fwd(() => block(xsep("do"), "end"))
  ).map(([_for, binding, _in, iterable, body]): Expr => ({
    type: "for",
    binding,
    iterable,
    body,
  }));

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

  const statement = either(ifStatement, forLoop, whileLoop, vardecl, indexAssign, fieldAssign, memberAssign, assign, lexicalBlock);

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
