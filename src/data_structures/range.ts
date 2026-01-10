import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import { defineBinding } from "../bootstrap/scope";
import type { BeepContext } from "../bootstrap/bootload";

export type RangeTypeObj =
  & RuntimeObjMixin<'RangeTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type RangeObj =
  & RuntimeObjMixin<'RangeObj', RangeTypeObj>
  & {
    start: bigint,
    end: bigint,
    mode: 'exclusive' | 'inclusive',
  }

export function initRange(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const rangeTypeObj: RangeTypeObj = {
    tag: 'RangeTypeObj',
    type: rootTypeObj,
    name: intern('range'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(rangeTypeObj.name, rangeTypeObj, k.kernelModule.toplevelScope);

  k.rangeTypeObj = rangeTypeObj;
  k.makeRangeObj = (start: bigint, end: bigint, mode: 'exclusive' | 'inclusive'): RangeObj => ({
    tag: 'RangeObj',
    type: rangeTypeObj,
    start,
    end,
    mode,
  });
}

export function initRangeMethods(k: BeepContext) {
  const { makeStringObj, makeListObj, rangeTypeObj, makeIntObj, makeDefNative } = k;

  const defMethod = makeDefNative<RangeObj>(k.kernelModule.toplevelScope, rangeTypeObj);

  defMethod('show', 0, thisObj => {
    const op = thisObj.mode === 'exclusive' ? '..' : '..=';
    return makeStringObj(`${thisObj.start}${op}${thisObj.end}`);
  });

  defMethod('start', 0, thisObj => {
    return makeIntObj(thisObj.start);
  });

  defMethod('stop_excl', 0, thisObj => {
    return makeIntObj(thisObj.mode === 'exclusive' ? thisObj.end : thisObj.end + 1n);
  });
}
