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

    // Override get_field to check struct fields first, then fall back to default
    const defaultGetField = namedStructType.methods.get(k.getFieldSymbol)!;
    const defInstanceMethod = k.makeDefNative<NamedStructObj>(k.kernelModule.toplevelScope, namedStructType);
    defInstanceMethod('get_field', 1, (thisObj, args) => {
      const fieldName = args[0] as SymbolObj;
      const structField = thisObj.fields.get(fieldName);
      if (structField !== undefined) {
        return structField;
      }
      // Fall back to default (methods, own methods)
      const boundDefault = k.bindMethod(defaultGetField, thisObj);
      return k.callMethod(boundDefault, args);
    });

    // Add 'new' own method for instantiation: Person.new('Alice', 30)
    const defOwnMethod = k.makeDefNative<NamedStructTypeObj>(k.kernelModule.toplevelScope, namedStructType, 'own');
    defOwnMethod('new', fields.length, (thisObj, args) => {
      return k.instantiateNamedStruct(thisObj, args);
    });

    // Add instance methods for NamedStructObj
    defInstanceMethod('show', 0, thisObj => k.makeStringObj(`<struct ${namedStructType.name.name}>`));

    return namedStructType;
  };

  k.instantiateNamedStruct = (namedStructTypeObj: NamedStructTypeObj, fieldValues: RuntimeObj[]): NamedStructObj => {
    const fieldNames = namedStructTypeObj.fields;
    if (fieldValues.length !== fieldNames.length) {
      throw new Error(`${namedStructTypeObj.name.name} expects ${fieldNames.length} fields, got ${fieldValues.length}`);
    }
    const fieldsMap = new Map<SymbolObj, RuntimeObj>();
    for (let i = 0; i < fieldNames.length; i++) {
      fieldsMap.set(fieldNames[i], fieldValues[i]);
    }
    return {
      tag: 'NamedStructObj',
      type: namedStructTypeObj,
      fields: fieldsMap,
    }
  };
}

export function initStructMethods(k: BeepKernel) {
  const defMethod = k.makeDefNative<NamedStructTypeObj>(k.kernelModule.toplevelScope, k.structTypeObj);
  defMethod('show', 0, thisObj => k.makeStringObj(`<type ${thisObj.name.name}>`));
  defMethod('fields', 0, thisObj => k.makeListObj(thisObj.fields));
}
