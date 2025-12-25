import type { SymbolEnv } from "../bootstrap/symbol_env";
import { type IntTypeObj } from "./int";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { defineBinding, getBindingByName } from "../runtime/scope";
import type { ModuleObj } from "../core_objects/module";
import { type RootTypeObj } from "../core_objects/root_type"
import type { BeepKernel } from "../bootstrap/kernel";

export type StringTypeObj =
  & RuntimeObjMixin<'StringTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type StringObj =
  & RuntimeObjMixin<'StringObj', StringTypeObj>
  & {
    value: string,
  }

export function initInt(k: BeepKernel) {
  const { rootTypeObj } = k;
  const intTypeObj: IntTypeObj = {
    tag: 'IntTypeObj',
    type: rootTypeObj,
    name: intern('int', k.symbolEnv),
    methods: new Map(),
  };
  defineBinding(intTypeObj.name, intTypeObj, k.sysModule.toplevelScope);
  
  k.intTypeObj = intTypeObj
  k.makeIntObj = (value: number) => ({
      tag: 'IntObj',
      type: intTypeObj,
      value,
    });
}

export function initString(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const stringTypeObj: StringTypeObj = {
    tag: 'StringTypeObj',
    type: rootTypeObj,
    name: intern('string'),
    methods: new Map(),
  };
  defineBinding(stringTypeObj.name, stringTypeObj, k.sysModule.toplevelScope);

  k.stringTypeObj = stringTypeObj;
  k.makeStringObj = (value: string): StringObj => ({
    tag: 'StringObj',
    type: stringTypeObj,
    value,
  });
}

export function registerStringMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m.toplevelScope, env)!;
  const intTypeObj = getBindingByName<IntTypeObj>('int', m.toplevelScope, env)!;

  const mShow = nativeUnboundMethod<StringObj>(m, env, 'string', 'show', 0, thisObj =>
    makeStringObj(`'${thisObj.value}'`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);

  // TODO: len - returns number of code points
  /*
  const mLen = nativeUnboundMethod<StringObj>(m, env, 'string', 'len', 0, thisObj => {
    const codePointCount = [...thisObj.value].length;
    return makeIntObj(codePointCount, intTypeObj);
  });
  mLen.receiverType.methods.set(mLen.name, mLen);
  */
}
