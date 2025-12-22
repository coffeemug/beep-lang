import type { Env } from "../env";
import { makeNativeMethodObj } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";

export type SymbolTypeObj =
  & RuntimeObjMixin<'SymbolTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type SymbolObj =
  & RuntimeObjMixin<'SymbolObj', SymbolTypeObj>
  & {
    name: string,
    id: number,
  }

export function makeSymbolTypeObj(rootTypeObj: RootTypeObj): Omit<SymbolTypeObj, 'name'> {
  return {
    tag: 'SymbolTypeObj',
    type: rootTypeObj,
    methods: new Map(),
  };
}

export function makeSymbolObj(name: string, id: number, symbolTypeObj: SymbolTypeObj): SymbolObj {
  return {
    tag: 'SymbolObj',
    type: symbolTypeObj,
    name,
    id,
  };
}

export function registerSymbolMethods(env: Env) {
  const symbolTypeObj = env.symbolTypeObj.deref()!;
  symbolTypeObj.methods.set(env.showSym, makeNativeMethodObj(
    symbolTypeObj, env.showSym, 0,
    (method) => {
      const thisObj = method.closureFrame.bindings.get(env.thisSymbol.id)! as SymbolObj;
      return makeStringObj(`${thisObj.name}:${thisObj.id}`, env.stringTypeObj.deref()!);
    },
    env.methodTypeObj.deref()!, env.currentFrame
  ));
}
