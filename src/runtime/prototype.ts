import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { exportBinding } from "../bootstrap/module";
import { type RootTypeObj } from "../bootstrap/root_type"
import { type BeepContext, registerDefaultMethods } from "../bootstrap/bootload";
import type { SymbolObj } from "../bootstrap/symbol";
import type { TypeObj } from "../runtime_objects";

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
  exportBinding(k.kernelModule, prototypeTypeObj.name, prototypeTypeObj);

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

    // Add 'mix_into' own method: MyProto.mix_into(SomeType)
    const defOwnMethod = k.makeDefNative<NamedPrototypeTypeObj>(namedPrototypeType, { binding: 'own' });
    defOwnMethod('mix_into', 1, (thisObj, args) => {
      const targetType = args[0] as TypeObj;
      // Copy all methods from this prototype to the target type
      // but don't overwrite existing.
      for (const [methodName, method] of thisObj.methods) {
        if (!targetType.methods.get(methodName)) {
          targetType.methods.set(methodName, method);
        }
      }
      return targetType;
    });

    return namedPrototypeType;
  };
}

export function initPrototypeMethods(k: BeepContext) {
  const defMethod = k.makeDefNative<NamedPrototypeTypeObj>(k.prototypeTypeObj);
  defMethod('show', 0, thisObj => k.makeStringObj(`<prototype ${thisObj.name.name}>`));
}
