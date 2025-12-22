import type { Env } from "../env";
import { makeNativeMethodObj } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";
import type { SymbolObj } from "./symbol";

export type IntTypeObj =
  & RuntimeObjMixin<'IntTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type IntObj =
  & RuntimeObjMixin<'IntObj', IntTypeObj>
  & {
    value: number,
  }

export function makeIntTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): IntTypeObj {
  return {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeIntObj(value: number, intTypeObj: IntTypeObj): IntObj {
  return {
    tag: 'IntObj',
    type: intTypeObj,
    value,
  };
}

export function registerIntMethods(env: Env) {
  const intTypeObj = env.intTypeObj.deref()!;
  intTypeObj.methods.set(env.showSym, makeNativeMethodObj(
    intTypeObj, env.showSym, 0,
    (method) => {
      const thisObj = method.closureFrame.bindings.get(env.thisSymbol.id)! as IntObj;
      return makeStringObj(thisObj.value.toString(), env.stringTypeObj.deref()!);
    },
    env.methodTypeObj.deref()!, env.currentFrame
  ));
}
