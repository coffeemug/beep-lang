import type { TypeObjMixin } from "./object_mixins";
import type { BeepKernel } from "./bootload";

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

export function initRootTypeMethods(k: BeepKernel) {
  const { makeDefNative, makeStringObj, rootTypeObj } = k;

  const defMethod = makeDefNative<RootTypeObj>(k.kernelModule.toplevelScope, rootTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(`<type ${thisObj.name.name}>`));
}
