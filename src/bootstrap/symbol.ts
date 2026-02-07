import type { RuntimeObjMixin, TypeObjMixin } from "./object_mixins";
import { type RootTypeObj } from "./root_type"
import type { BeepContext } from "./bootload";
import type { SymbolId } from "./symbol_space";
import { symbolName } from "../parser/parser";
import { fromString, lexMode, seq, eof } from "@spakhm/ts-parsec";

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    id: SymbolId,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name' | 'bindingModule'> {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
    ownMethods: new Map(),
  };
}

export function makeSymbolObj(name: string, id: SymbolId, symbolTypeObj: SymbolTypeObj): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    id,
  };
}

export function initSymbolMethods(k: BeepContext) {
  const { makeDefMethodNative: makeDefNative, makeStringObj, makeIntObj, symbolTypeObj } = k;

  const defMethod = makeDefNative<SymbolObj>(symbolTypeObj);

  defMethod('show', 0, thisObj => {
    const name = thisObj.name;
    const result = lexMode("keep_all", seq(symbolName, eof))(fromString(name));
    if (result.type === 'ok') {
      return makeStringObj(name);
    } else {
      return makeStringObj(`:'${name}'`);
    }
  });
  defMethod('id', 0, thisObj => makeIntObj(thisObj.id));

  defMethod('lt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'SymbolObj') {
      throw new Error(`lt requires a symbol, got ${k.show(other)}`);
    }
    return thisObj.name < (other as SymbolObj).name ? k.trueObj : k.falseObj;
  });

  defMethod('lte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'SymbolObj') {
      throw new Error(`lte requires a symbol, got ${k.show(other)}`);
    }
    return thisObj.name <= (other as SymbolObj).name ? k.trueObj : k.falseObj;
  });

  defMethod('gt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'SymbolObj') {
      throw new Error(`gt requires a symbol, got ${k.show(other)}`);
    }
    return thisObj.name > (other as SymbolObj).name ? k.trueObj : k.falseObj;
  });

  defMethod('gte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'SymbolObj') {
      throw new Error(`gte requires a symbol, got ${k.show(other)}`);
    }
    return thisObj.name >= (other as SymbolObj).name ? k.trueObj : k.falseObj;
  });
}
