import type { Expr } from "./parser";
import type { Pattern } from "../runtime/pattern";
import type { SymbolObj } from "../bootstrap/symbol";

type Clause = { params: Pattern; body: Expr };

type ClauseGroup = {
  def: Expr;          // first def in group (template for reconstruction)
  clauses: Clause[];
};

type GroupedItem = Expr | ClauseGroup;

function isGroup(item: GroupedItem): item is ClauseGroup {
  return 'clauses' in item;
}

// Grouping key: unique per function/method identity, null for non-defs
function defKey(expr: Expr): string | null {
  if (expr.type === 'functionDef') return `f:${expr.name.id}`;
  if (expr.type === 'methodDef') return `m:${expr.receiverType.id}:${expr.name.id}`;
  return null;
}

// Human-readable name for error messages
function defName(expr: Expr): string {
  if (expr.type === 'functionDef') return expr.name.name;
  if (expr.type === 'methodDef') return `${expr.receiverType.name}/${expr.name.name}`;
  throw new Error("unreachable");
}

function extractClause(expr: Expr): Clause {
  if (expr.type === 'functionDef' || expr.type === 'methodDef') {
    return { params: expr.params, body: expr.body };
  }
  throw new Error("unreachable");
}

function clauseArity(clause: Clause): number {
  const pat = clause.params as { type: 'list'; elements: Pattern[] };
  return pat.elements.length;
}

// Step 1: Group consecutive same-key defs into ClauseGroups
function groupClauses(exprs: Expr[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;
  while (i < exprs.length) {
    const key = defKey(exprs[i]);
    if (key === null) {
      result.push(exprs[i]);
      i++;
      continue;
    }
    // Start a new group
    const group: ClauseGroup = { def: exprs[i], clauses: [extractClause(exprs[i])] };
    i++;
    while (i < exprs.length && defKey(exprs[i]) === key) {
      group.clauses.push(extractClause(exprs[i]));
      i++;
    }
    result.push(group);
  }
  return result;
}

// Step 2: Validate contiguity and arity contiguity
function validateGroups(items: GroupedItem[]): void {
  const seen = new Map<string, string>(); // key -> name (for error messages)

  for (const item of items) {
    if (!isGroup(item)) continue;

    const key = defKey(item.def)!;
    const name = defName(item.def);

    // Check no duplicate keys across groups (non-contiguous defs)
    if (seen.has(key)) {
      throw new Error(`Non-contiguous definitions for '${name}'`);
    }
    seen.set(key, name);

    // Check arity contiguity within group
    if (item.clauses.length > 1) {
      const seenArities = new Set<number>();
      let lastArity: number | null = null;
      for (const clause of item.clauses) {
        const arity = clauseArity(clause);
        if (arity !== lastArity) {
          if (seenArities.has(arity)) {
            throw new Error(
              `Non-contiguous ${arity}-arg clauses for '${name}'`
            );
          }
          seenArities.add(arity);
          lastArity = arity;
        }
      }
    }
  }
}

// Step 3: Desugar multi-clause groups into single defs with case bodies
function desugarGroups(items: GroupedItem[], intern: (name: string) => SymbolObj): Expr[] {
  return items.map(item => {
    if (!isGroup(item)) return item;
    if (item.clauses.length === 1) return item.def;

    const argsSym = intern(" __args__"); // space prefix: unparseable from source
    const params: Pattern = {
      type: "list",
      elements: [],
      spread: { type: "binding", sym: argsSym, scope: "lexical" },
    };
    const body: Expr = {
      type: "case",
      subject: { type: "lexicalVar", sym: argsSym },
      branches: item.clauses.map(c => ({ pattern: c.params, body: c.body })),
    };

    const def = item.def;
    if (def.type === 'functionDef') {
      return { type: "functionDef" as const, name: def.name, params, body };
    } else if (def.type === 'methodDef') {
      return { type: "methodDef" as const, receiverType: def.receiverType, name: def.name, params, body };
    }
    throw new Error("unreachable");
  });
}

// Full pipeline: group → validate → desugar
export function desugarClauses(exprs: Expr[], intern: (name: string) => SymbolObj): Expr[] {
  const grouped = groupClauses(exprs);
  validateGroups(grouped);
  return desugarGroups(grouped, intern);
}
