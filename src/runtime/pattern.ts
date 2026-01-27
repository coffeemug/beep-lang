import type { RuntimeObj } from "../runtime_objects";
import type { SymbolObj } from "../bootstrap/symbol";
import type { IntObj } from "../data_structures/int";
import type { StringObj } from "../data_structures/string";
import type { ListObj } from "../data_structures/list";
import type { MapObj } from "../data_structures/map";
import type { Expr } from "./parser";
import type { BeepContext } from "../bootstrap/bootload";
import type { ScopeObj } from "../bootstrap/scope";

export type MapPatternField = {
  key: SymbolObj;
  pattern: Pattern;
  default_: Expr | null;
};

export type Pattern =
  | { type: "wildcard" }
  | { type: "binding"; sym: SymbolObj; scope: 'lexical' | 'dynamic' }
  | { type: "symbol"; sym: SymbolObj }
  | { type: "int"; value: bigint }
  | { type: "string"; value: string }
  | { type: "list"; elements: Pattern[]; spread: Pattern | null }
  | { type: "map"; fields: MapPatternField[]; spread: Pattern | null; exhaustive?: boolean }

export type Binding = { sym: SymbolObj; value: RuntimeObj; scope: 'lexical' | 'dynamic' };

export type MatchResult =
  | { matched: true; bindings: Binding[] }
  | { matched: false };

function exhaustive(_: never): never {
  throw new Error('Exhaustive check failed');
}

export function isAssignable(pattern: Pattern): boolean {
  switch (pattern.type) {
    case 'wildcard':
    case 'binding':
      return true;
    case 'list':
      return pattern.elements.every(isAssignable)
        && (pattern.spread === null || isAssignable(pattern.spread));
    case 'map':
      return pattern.fields.every(f => isAssignable(f.pattern))
        && (pattern.spread === null || isAssignable(pattern.spread));
    case 'symbol':
    case 'int':
    case 'string':
      return false;
    default:
      return exhaustive(pattern);
  }
}

export function matchPattern(
  pattern: Pattern,
  value: RuntimeObj,
  ctx: BeepContext,
  scope: ScopeObj
): MatchResult {
  switch (pattern.type) {
    case 'wildcard':
      return { matched: true, bindings: [] };

    case 'binding':
      return { matched: true, bindings: [{ sym: pattern.sym, value, scope: pattern.scope }] };

    case 'symbol':
      if (value.tag === 'SymbolObj' && value === pattern.sym) {
        return { matched: true, bindings: [] };
      }
      return { matched: false };

    case 'int':
      if (value.tag === 'IntObj' && (value as IntObj).value === pattern.value) {
        return { matched: true, bindings: [] };
      }
      return { matched: false };

    case 'string':
      if (value.tag === 'StringObj' && (value as StringObj).value === pattern.value) {
        return { matched: true, bindings: [] };
      }
      return { matched: false };

    case 'list': {
      if (value.tag !== 'ListObj') return { matched: false };
      const list = value as ListObj;

      // Without spread: exact length match required
      if (pattern.spread === null) {
        if (list.elements.length !== pattern.elements.length) return { matched: false };
      } else {
        // With spread: at least pattern.elements.length items required
        if (list.elements.length < pattern.elements.length) return { matched: false };
      }

      const listBindings: Binding[] = [];

      // Match fixed elements
      for (let i = 0; i < pattern.elements.length; i++) {
        const result = matchPattern(pattern.elements[i], list.elements[i], ctx, scope);
        if (!result.matched) return { matched: false };
        listBindings.push(...result.bindings);
      }

      // Match spread (collect remaining elements into a new list)
      if (pattern.spread !== null) {
        const restElements = list.elements.slice(pattern.elements.length);
        const restList = ctx.makeListObj(restElements);
        const result = matchPattern(pattern.spread, restList, ctx, scope);
        if (!result.matched) return { matched: false };
        listBindings.push(...result.bindings);
      }

      return { matched: true, bindings: listBindings };
    }

    case 'map': {
      if (value.tag !== 'MapObj') return { matched: false };
      const map = value as MapObj;
      const mapBindings: Binding[] = [];
      const matchedKeys = new Set<SymbolObj>();

      // Match specified fields
      for (const field of pattern.fields) {
        matchedKeys.add(field.key);
        const mapValue = map.kv.get(field.key);
        if (mapValue === undefined) {
          // Key not present - use default if available
          if (field.default_ !== null) {
            const defaultValue = ctx.evaluate(field.default_, scope).value;
            const result = matchPattern(field.pattern, defaultValue, ctx, scope);
            if (!result.matched) return { matched: false };
            mapBindings.push(...result.bindings);
          } else {
            return { matched: false };
          }
        } else {
          const result = matchPattern(field.pattern, mapValue, ctx, scope);
          if (!result.matched) return { matched: false };
          mapBindings.push(...result.bindings);
        }
      }

      // Match spread (collect unmatched keys into a new map)
      if (pattern.spread !== null) {
        const restPairs: [SymbolObj, RuntimeObj][] = [];
        for (const [key, val] of map.kv.entries()) {
          if (!matchedKeys.has(key)) {
            restPairs.push([key, val]);
          }
        }
        const restMap = ctx.makeMapObj(restPairs);
        const result = matchPattern(pattern.spread, restMap, ctx, scope);
        if (!result.matched) return { matched: false };
        mapBindings.push(...result.bindings);
      }

      // Exhaustive matching: fail if value has keys not in pattern
      if (pattern.exhaustive) {
        for (const key of map.kv.keys()) {
          if (!matchedKeys.has(key)) {
            return { matched: false };
          }
        }
      }

      return { matched: true, bindings: mapBindings };
    }

    default:
      return exhaustive(pattern);
  }
}
