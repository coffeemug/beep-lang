import type { TypeObjMixin } from "./mixins";

export type RootTypeObj = TypeObjMixin & {
  /* Fields common to every runtime object */
  tag: 'RootTypeObj',
  type: RootTypeObj,

  /* Fields specific to RootTypeObj */
}

export function makeRootTypeObj(): RootTypeObj {
  const obj: Partial<RootTypeObj> = {
    tag: 'RootTypeObj',
    methods: new Map(),
  };

  // The type of RootTypeObj is itself
  obj.type = obj as RootTypeObj;
  return obj as RootTypeObj;
}
