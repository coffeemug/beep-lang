import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { defineBinding } from "../bootstrap/scope";
import type { BeepKernel } from "../bootstrap/bootload";
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

export function initMap(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const mapTypeObj: MapTypeObj = {
    tag: 'MapTypeObj',
    type: rootTypeObj,
    name: intern('map'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(mapTypeObj.name, mapTypeObj, k.kernelModule.toplevelScope);

  k.mapTypeObj = mapTypeObj;
  k.makeMapObj = (pairs: [SymbolObj, RuntimeObj][]): MapObj => ({
    tag: 'MapObj',
    type: mapTypeObj,
    kv: new Map(pairs),
  });
}

export function initMapMethods(k: BeepKernel) {
  const {
    makeStringObj, mapTypeObj, show, makeDefNative,
  } = k;

  const defMethod = makeDefNative<MapObj>(k.kernelModule.toplevelScope, mapTypeObj)

  defMethod('show', 0, thisObj => {
    const items = thisObj.kv.entries().map(e =>
      `${show(e[0])}:${show(e[1])}`).toArray().join(', ');
    return makeStringObj(`{ ${items} }`);
  });
}
