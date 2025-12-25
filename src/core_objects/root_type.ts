import type { SymbolEnv } from "../bootstrap/symbol_env";
import type { TypeObjMixin } from "./object_mixins";
import { getBindingByName } from "../runtime/scope";
import type { ModuleObj } from "./module";

export type RootTypeObj = TypeObjMixin & {
  /* Fields common to every runtime object */
  tag: 'RootTypeObj',
  type: RootTypeObj,

  /* Fields specific to RootTypeObj */
}

export function makeRootTypeObj(): Omit<RootTypeObj, 'name' | 'bindingModule'> {
  const obj: Partial<RootTypeObj> = {
    tag: 'RootTypeObj',
    methods: new Map(),
  };

  // The type of RootTypeObj is itself
  obj.type = obj as RootTypeObj;
  return obj as Omit<RootTypeObj, 'name' | 'bindingModule'>;
}

export function registerRootTypeMethods(m: ModuleObj, env: SymbolEnv) {
  const mShow = nativeUnboundMethod<RootTypeObj>(m, env, 'type', 'show', 0, thisObj =>
    makeStringObj(`<type ${thisObj.name.name}>`, stringTypeObj));
  mShow.receiverType.methods.set(mShow.name, mShow);
}
