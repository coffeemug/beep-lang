import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import { type BeepKernel, registerDefaultMethods } from "../bootstrap/bootload";
import type { SymbolObj } from "../bootstrap/symbol";
import type { RuntimeObj } from "../runtime_objects";

export type StructTypeObj =
  & RuntimeObjMixin<'StructTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type NamedStructTypeObj =
  & RuntimeObjMixin<'NamedStructTypeObj', StructTypeObj>
  & TypeObjMixin
  & {
    fields: SymbolObj[],
  }

export type NamedStructObj =
  & RuntimeObjMixin<'NamedStructObj', NamedStructTypeObj>
  & {
    fields: Map<SymbolObj, RuntimeObj>,
  }

export function initStruct(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const structTypeObj: StructTypeObj = {
    tag: 'StructTypeObj',
    type: rootTypeObj,
    name: intern('structure'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(structTypeObj.name, structTypeObj, k.kernelModule.toplevelScope);

  k.structTypeObj = structTypeObj;
  k.defineNamedStruct = (name: SymbolObj, fields: SymbolObj[]): NamedStructTypeObj => {
    const namedStructType: NamedStructTypeObj = {
      tag: 'NamedStructTypeObj',
      type: structTypeObj,
      name,
      fields,
      methods: new Map(),
      ownMethods: new Map(),
    };
    registerDefaultMethods(k, namedStructType);
    return namedStructType;
  };

  k.instantiateNamedStruct = (namedStructTypeObj: NamedStructTypeObj, fields: RuntimeObj[]): NamedStructObj => {
    // TODO: validate fields
    return {
      tag: 'NamedStructObj',
      type: namedStructTypeObj,
      fields: new Map(),
    }
  };
}

export function initStructMethods(k: BeepKernel) {
  const defMethod = k.makeDefNative<NamedStructTypeObj>(k.kernelModule.toplevelScope, k.structTypeObj);
  defMethod('show', 0, thisObj => k.makeStringObj(`<type ${thisObj.name.name}>`));
  defMethod('fields', 0, thisObj => k.makeListObj(thisObj.fields));
}
