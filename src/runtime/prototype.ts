import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import { type BeepContext, registerDefaultMethods } from "../bootstrap/bootload";
import type { SymbolObj } from "../bootstrap/symbol";

export type PrototypeTypeObj =
  & RuntimeObjMixin<'PrototypeTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type NamedPrototypeTypeObj =
  & RuntimeObjMixin<'NamedPrototypeTypeObj', PrototypeTypeObj>
  & TypeObjMixin
  & {}

export function initPrototype(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const prototypeTypeObj: PrototypeTypeObj = {
    tag: 'PrototypeTypeObj',
    type: rootTypeObj,
    name: intern('prototype'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(prototypeTypeObj.name, prototypeTypeObj, k.kernelModule.toplevelScope);

  k.prototypeTypeObj = prototypeTypeObj;
  k.defineNamedPrototype = (name: SymbolObj): NamedPrototypeTypeObj => {
    const namedPrototypeType: NamedPrototypeTypeObj = {
      tag: 'NamedPrototypeTypeObj',
      type: prototypeTypeObj,
      name,
      methods: new Map(),
      ownMethods: new Map(),
    };
    registerDefaultMethods(k, namedPrototypeType);

    return namedPrototypeType;
  };
}

export function initPrototypeMethods(k: BeepContext) {
  const defMethod = k.makeDefNative<NamedPrototypeTypeObj>(k.kernelModule.toplevelScope, k.prototypeTypeObj);
  defMethod('show', 0, thisObj => k.makeStringObj(`<prototype ${thisObj.name.name}>`));
}
