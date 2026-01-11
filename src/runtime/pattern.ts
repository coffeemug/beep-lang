import type { RuntimeObj } from "../runtime_objects";
import type { SymbolObj } from "../bootstrap/symbol";
import type { IntObj } from "../data_structures/int";
import type { StringObj } from "../data_structures/string";
import type { ListObj } from "../data_structures/list";

export type Pattern =
  | { type: "wildcard" }
  | { type: "binding"; sym: SymbolObj }
  | { type: "symbol"; sym: SymbolObj }
  | { type: "int"; value: bigint }
  | { type: "string"; value: string }
  | { type: "list"; elements: Pattern[] }

export type MatchResult =
  | { matched: true; bindings: Map<SymbolObj, RuntimeObj> }
  | { matched: false };

export function matchPattern(pattern: Pattern, value: RuntimeObj): MatchResult {
  switch (pattern.type) {
    case 'wildcard':
      return { matched: true, bindings: new Map() };

    case 'binding':
      return { matched: true, bindings: new Map([[pattern.sym, value]]) };

    case 'symbol':
      if (value.tag === 'SymbolObj' && value === pattern.sym) {
        return { matched: true, bindings: new Map() };
      }
      return { matched: false };

    case 'int':
      if (value.tag === 'IntObj' && (value as IntObj).value === pattern.value) {
        return { matched: true, bindings: new Map() };
      }
      return { matched: false };

    case 'string':
      if (value.tag === 'StringObj' && (value as StringObj).value === pattern.value) {
        return { matched: true, bindings: new Map() };
      }
      return { matched: false };

    case 'list':
      if (value.tag !== 'ListObj') return { matched: false };
      const list = value as ListObj;
      if (list.elements.length !== pattern.elements.length) return { matched: false };
      const bindings = new Map<SymbolObj, RuntimeObj>();
      for (let i = 0; i < pattern.elements.length; i++) {
        const result = matchPattern(pattern.elements[i], list.elements[i]);
        if (!result.matched) return { matched: false };
        for (const [sym, val] of result.bindings) bindings.set(sym, val);
      }
      return { matched: true, bindings };
  }
}
