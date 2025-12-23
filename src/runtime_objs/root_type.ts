import type { SymbolEnv } from "../bootstrap/symbol_env";
import { getThisObj, nativeMethod } from "./methods";
import type { TypeObjMixin } from "./mixins";
import { getBindingByName, type ModuleObj } from "./module";
import { makeStringObj, type StringTypeObj } from "./string";

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

  const mShow = nativeMethod(m, env, 'type', 'show', 0, (method) => {
    const thisObj = getThisObj<RootTypeObj>(method, env);
    return makeStringObj(`<type ${thisObj.name.name}>`, stringTypeObj);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);
}
