import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { defineBinding } from "../bootstrap/scope";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { BeepKernel } from "../bootstrap/bootload";
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
  k.defineNamedStruct = (name: SymbolObj, fields: SymbolObj[]): NamedStructTypeObj => ({
    tag: 'NamedStructTypeObj',
    type: structTypeObj,
    name,
    fields,
    methods: new Map(),
    ownMethods: new Map(),
  });

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
}
