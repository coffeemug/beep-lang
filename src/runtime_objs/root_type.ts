import { getThisObj, type Env } from "../env";
import { makeNativeMethodObj } from "./methods";
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
  const rootTypeObj = env.rootTypeObj.deref()!;
  rootTypeObj.methods.set(env.showSym, makeNativeMethodObj(
    rootTypeObj, env.showSym, 0,
    (method) => {
      const thisObj = getThisObj<RootTypeObj>(method, env);
      return makeStringObj(`<type ${thisObj.name.name}>`, env.stringTypeObj.deref()!);
    },
    env.methodTypeObj.deref()!, env.currentFrame
  ));
}
