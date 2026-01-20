import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { exportBinding } from "../bootstrap/module";
import type { BeepContext } from "../bootstrap/bootload";
import type { SymbolObj } from "../bootstrap/symbol";

export type MapTypeObj =
  & RuntimeObjMixin<'MapTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type MapObj =
  & RuntimeObjMixin<'MapObj', MapTypeObj>
  & {
    kv: Map<SymbolObj, RuntimeObj>,
  }

export function initMap(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const mapTypeObj: MapTypeObj = {
    tag: 'MapTypeObj',
    type: rootTypeObj,
    name: intern('map'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  exportBinding(k.kernelModule, mapTypeObj.name, mapTypeObj);

  k.mapTypeObj = mapTypeObj;
  k.makeMapObj = (pairs: [SymbolObj, RuntimeObj][]): MapObj => ({
    tag: 'MapObj',
    type: mapTypeObj,
    kv: new Map(pairs),
  });
}

export function initMapMethods(k: BeepContext) {
  const {
    makeStringObj, mapTypeObj, show, makeDefNative, makeListObj
  } = k;

  const defMethod = makeDefNative<MapObj>(mapTypeObj)

  defMethod('show', 0, thisObj => {
    const items = thisObj.kv.entries().map(e =>
      `${show(e[0])}: ${show(e[1])}`).toArray().join(', ');
    return makeStringObj(items.length == 0 ? '{}' : `{ ${items} }`);
  });

  defMethod('get_item', 1, (thisObj, args) => {
    const fieldName = args[0] as SymbolObj;
    const kvValue = thisObj.kv.get(fieldName);
    if (kvValue === undefined) {
      throw new Error(`Key ${fieldName.name} not found in map`);
    }
    return kvValue;
  });

  defMethod('set_item', 2, (thisObj, args) => {
    const fieldName = args[0] as SymbolObj;
    thisObj.kv.set(fieldName, args[1]);
    return args[1];
  });

  defMethod('keys', 0, (thisObj) =>
    makeListObj(thisObj.kv.keys().toArray()));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'MapObj') return k.falseObj;
    const otherMap = other as MapObj;
    if (thisObj.kv.size !== otherMap.kv.size) return k.falseObj;
    for (const [key, value] of thisObj.kv) {
      const otherValue = otherMap.kv.get(key);
      if (otherValue === undefined) return k.falseObj;
      if (!k.isEqual(value, otherValue)) return k.falseObj;
    }
    return k.trueObj;
  });
}
