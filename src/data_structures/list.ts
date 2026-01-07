import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { defineBinding } from "../bootstrap/scope";
import type { BeepContext } from "../bootstrap/bootload";
import type { IntObj } from "./int";

export type ListTypeObj =
  & RuntimeObjMixin<'ListTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type ListObj =
  & RuntimeObjMixin<'ListObj', ListTypeObj>
  & {
    elements: RuntimeObj[],
  }

export function initList(k: BeepContext) {
  const { rootTypeObj, intern } = k;
  const listTypeObj: ListTypeObj = {
    tag: 'ListTypeObj',
    type: rootTypeObj,
    name: intern('list'),
    methods: new Map(),
    ownMethods: new Map(),
  };
  defineBinding(listTypeObj.name, listTypeObj, k.kernelModule.toplevelScope);

  k.listTypeObj = listTypeObj;
  k.makeListObj = (elements: RuntimeObj[]): ListObj => ({
    tag: 'ListObj',
    type: listTypeObj,
    elements,
  });
}

export function initListMethods(k: BeepContext) {
  const {
    makeStringObj, makeListObj, listTypeObj, makeIntObj,
    show, makeDefNative
  } = k;

  const defMethod = makeDefNative<ListObj>(k.kernelModule.toplevelScope, listTypeObj)

  defMethod('show', 0, thisObj => {
    const items = thisObj.elements.map(e => show(e)).join(', ');
    return makeStringObj(`[${items}]`);
  });

  defMethod('push', 1, (thisObj, args) =>
    makeListObj([...thisObj.elements, args[0]]));

  defMethod('push!', 1, (thisObj, args) => {
    thisObj.elements.push(args[0]);
    return thisObj;
  });

  defMethod('pop', 0, thisObj =>
    makeListObj(thisObj.elements.slice(0, -1)));

  defMethod('pop!', 0, thisObj => {
    thisObj.elements.pop();
    return thisObj;
  });

  defMethod('push_front', 1, (thisObj, args) =>
    makeListObj([args[0], ...thisObj.elements]));

  defMethod('push_front!', 1, (thisObj, args) => {
    thisObj.elements.unshift(args[0]);
    return thisObj;
  });

  defMethod('pop_front', 0, thisObj =>
    makeListObj(thisObj.elements.slice(1)));

  defMethod('pop_front!', 0, thisObj => {
    thisObj.elements.shift();
    return thisObj;
  });

  defMethod('len', 0, thisObj =>
    makeIntObj(BigInt(thisObj.elements.length)));

  defMethod('get_item', 1, (thisObj, args) => {
    if (args[0].tag !== 'IntObj') {
      throw new Error(`List index must be an integer, got ${args[0].tag}`);
    }
    const idx = Number((args[0] as IntObj).value);
    if (idx >= thisObj.elements.length) {
      throw new Error("Index out of bounds");
    }
    return thisObj.elements[idx];
  });

  defMethod('set_item', 2, (thisObj, args) => {
    if (args[0].tag !== 'IntObj') {
      throw new Error(`List index must be an integer, got ${args[0].tag}`);
    }
    const idx = Number((args[0] as IntObj).value);
    if (idx >= thisObj.elements.length) {
      throw new Error("Index out of bounds");
    }
    thisObj.elements[idx] = args[1];
    return args[1];
  });

  const deepFlatten = (elements: RuntimeObj[]): RuntimeObj[] => {
    const result: RuntimeObj[] = [];
    for (const el of elements) {
      if (el.tag === 'ListObj') {
        result.push(...deepFlatten((el as ListObj).elements));
      } else {
        result.push(el);
      }
    }
    return result;
  };

  defMethod('flatten', 0, thisObj => makeListObj(deepFlatten(thisObj.elements)));

  defMethod('eq', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'ListObj') return k.falseObj;
    const otherList = other as ListObj;
    if (thisObj.elements.length !== otherList.elements.length) return k.falseObj;
    for (let i = 0; i < thisObj.elements.length; i++) {
      if (!k.isEqual(thisObj.elements[i], otherList.elements[i])) {
        return k.falseObj;
      }
    }
    return k.trueObj;
  });

  // Lexicographic comparison for lists
  const compareLists = (a: ListObj, b: ListObj): number => {
    const minLen = Math.min(a.elements.length, b.elements.length);
    for (let i = 0; i < minLen; i++) {
      const aEl = a.elements[i];
      const bEl = b.elements[i];
      // Use lt method to compare elements
      const ltResult = k.callMethod(aEl, k.ltSymbol, [bEl]);
      if (k.isEqual(ltResult, k.trueObj)) return -1;
      const gtResult = k.callMethod(aEl, k.gtSymbol, [bEl]);
      if (k.isEqual(gtResult, k.trueObj)) return 1;
    }
    return a.elements.length - b.elements.length;
  };

  defMethod('lt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'ListObj') {
      throw new Error(`lt requires a list, got ${k.show(other)}`);
    }
    return compareLists(thisObj, other as ListObj) < 0 ? k.trueObj : k.falseObj;
  });

  defMethod('lte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'ListObj') {
      throw new Error(`lte requires a list, got ${k.show(other)}`);
    }
    return compareLists(thisObj, other as ListObj) <= 0 ? k.trueObj : k.falseObj;
  });

  defMethod('gt', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'ListObj') {
      throw new Error(`gt requires a list, got ${k.show(other)}`);
    }
    return compareLists(thisObj, other as ListObj) > 0 ? k.trueObj : k.falseObj;
  });

  defMethod('gte', 1, (thisObj, args) => {
    const other = args[0];
    if (other.tag !== 'ListObj') {
      throw new Error(`gte requires a list, got ${k.show(other)}`);
    }
    return compareLists(thisObj, other as ListObj) >= 0 ? k.trueObj : k.falseObj;
  });
}
