import type { SymbolEnv } from "../bootstrap/symbol_env";
import { nativeMethod } from "./methods";
import type { TypeObjMixin } from "./object_mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { makeStringObj, type StringTypeObj } from "../data_structures/string";

export type RootTypeObj = TypeObjMixin & {
  /* Fields common to every runtime object */
  tag: 'RootTypeObj',
  type: RootTypeObj,

  /* Fields specific to RootTypeObj */
}

export function makeRootTypeObj(): Omit<RootTypeObj, 'name'> {
  const obj: Partial<RootTypeObj> = {
    tag: 'RootTypeObj',
    methods: new Map(),
  };

  // The type of RootTypeObj is itself
  obj.type = obj as RootTypeObj;
  return obj as Omit<RootTypeObj, 'name'>;
}

export function registerRootTypeMethods(m: ModuleObj, env: SymbolEnv) {
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;

  const mShow = nativeMethod<RootTypeObj>(m, env, 'type', 'show', 0, thisObj =>
    makeStringObj(`<type ${thisObj.name.name}>`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
