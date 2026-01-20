import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { exportBinding } from "../bootstrap/module";
import { type RootTypeObj } from "../bootstrap/root_type"
import { type BeepContext, registerDefaultMethods } from "../bootstrap/bootload";
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

export function initStruct(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const structTypeObj: StructTypeObj = {
    tag: 'StructTypeObj',
    type: rootTypeObj,
    name: intern('structure'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(k.kernelModule, structTypeObj.name, structTypeObj);

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

    // Save the default get_field before overriding
    const defaultGetField = namedStructType.methods.get(k.getFieldSymbol)!;
    const defInstanceMethod = k.makeDefNative<NamedStructObj>(namedStructType);

    // Override get_field to check struct fields first, then fall back to default
    defInstanceMethod('get_field', 1, (thisObj, args) => {
      const fieldName = args[0] as SymbolObj;
      const structField = thisObj.fields.get(fieldName);
      if (structField !== undefined) {
        return structField;
      }
      // Fall back to default (methods, own methods)
      return k.callBoundMethod(k.bindMethod(defaultGetField, thisObj), args);
    });

    // set_field sets a struct field (not methods)
    defInstanceMethod('set_field', 2, (thisObj, args) => {
      const fieldName = args[0] as SymbolObj;
      if (!thisObj.fields.has(fieldName)) {
        throw new Error(`Cannot set field ${fieldName.name} on struct ${namedStructType.name.name} (not a field)`);
      }
      thisObj.fields.set(fieldName, args[1]);
      return args[1];
    });

    // Add 'new' own method for instantiation: Person.new('Alice', 30)
    const defOwnMethod = k.makeDefNative<NamedStructTypeObj>(namedStructType, { binding: 'own' });
    defOwnMethod('new', fields.length, (thisObj, args) => {
      return k.instantiateNamedStruct(thisObj, args);
    });

    // Add instance methods for NamedStructObj
    defInstanceMethod('show', 0, thisObj => k.makeStringObj(`<struct ${namedStructType.name.name}>`));

    defInstanceMethod('eq', 1, (thisObj, args) => {
      const other = args[0];
      // Must be exactly the same struct type (same type object)
      if (other.type !== thisObj.type) return k.falseObj;
      const otherStruct = other as NamedStructObj;
      // Compare all fields defined by the struct type
      for (const fieldName of namedStructType.fields) {
        const thisValue = thisObj.fields.get(fieldName)!;
        const otherValue = otherStruct.fields.get(fieldName)!;
        if (!k.isEqual(thisValue, otherValue)) return k.falseObj;
      }
      return k.trueObj;
    });

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

export function initStructMethods(k: BeepContext) {
  const defMethod = k.makeDefNative<NamedStructTypeObj>(k.structTypeObj);
  defMethod('show', 0, thisObj => k.makeStringObj(`<type ${thisObj.name.name}>`));
  defMethod('fields', 0, thisObj => k.makeListObj(thisObj.fields));
}
