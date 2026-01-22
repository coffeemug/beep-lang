import type { TypeObjMixin } from "./object_mixins";
import type { BeepContext } from "./bootload";

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
    ownMethods: new Map(),
  };

  // The type of RootTypeObj is itself
  obj.type = obj as RootTypeObj;
  return obj as Omit<RootTypeObj, 'name' | 'bindingModule'>;
}

export function initRootTypeMethods(k: BeepContext) {
  const { makeDefMethodNative: makeDefNative, makeStringObj, rootTypeObj, makeListObj } = k;

  const defMethod = makeDefNative<RootTypeObj>(rootTypeObj);

  defMethod('show', 0, thisObj => makeStringObj(`<type ${thisObj.name.name}>`));
  defMethod('own_methods', 0, thisObj => makeListObj(thisObj.ownMethods.values().toArray()));
}
