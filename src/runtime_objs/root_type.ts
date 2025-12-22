import { getThisObj, type Env } from "../env";
import { nativeMethod } from "./methods";
import type { TypeObjMixin } from "./mixins";
import { makeStringObj } from "./string";

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

export function registerRootTypeMethods(env: Env) {
  const m = nativeMethod(env, 'type', 'show', 0, (method) => {
    const thisObj = getThisObj<RootTypeObj>(method, env);
    return makeStringObj(`<type ${thisObj.name.name}>`, env.stringTypeObj.deref()!);
  });
  m.receiverType.methods.set(m.name, m);
}
