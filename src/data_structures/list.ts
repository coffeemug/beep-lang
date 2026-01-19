import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { defineBinding } from "../bootstrap/scope";
import type { BeepContext } from "../bootstrap/bootload";
import type { IntObj } from "./int";
import type { StringObj } from "./string";
import { binding } from "process";

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

  const defMethod = makeDefNative<ListObj>(listTypeObj);
  const defOwnMethod = makeDefNative<ListTypeObj>(listTypeObj, { binding: 'own' });

  // list.new([3, 3], 0) creates a 3x3 array filled with 0
  defOwnMethod('new', 2, (_thisObj, args) => {
    const dims = args[0];
    const fill = args[1];
    if (dims.tag !== 'ListObj') {
      throw new Error(`list.new requires a list of dimensions, got ${show(dims)}`);
    }
    const dimList = (dims as ListObj).elements;
    if (dimList.length === 0) {
      throw new Error('list.new requires at least one dimension');
    }
    for (const d of dimList) {
      if (d.tag !== 'IntObj') {
        throw new Error(`list.new dimensions must be integers, got ${show(d)}`);
      }
    }

    const buildArray = (dimIndex: number): ListObj => {
      const size = Number((dimList[dimIndex] as IntObj).value);
      const elements: RuntimeObj[] = [];
      for (let i = 0; i < size; i++) {
        if (dimIndex < dimList.length - 1) {
          elements.push(buildArray(dimIndex + 1));
        } else {
          elements.push(fill);
        }
      }
      return makeListObj(elements);
    };

    return buildArray(0);
  })

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

  defMethod('pop!', 0, thisObj => {
    const x = thisObj.elements.pop();
    if (!x) {
      throw new Error("Cannot pop from empty array.");
    }
    return x;
  });

  defMethod('push_front', 1, (thisObj, args) =>
    makeListObj([args[0], ...thisObj.elements]));

  defMethod('push_front!', 1, (thisObj, args) => {
    thisObj.elements.unshift(args[0]);
    return thisObj;
  });

  defMethod('pop_front!', 0, thisObj => {
    const x = thisObj.elements.shift();
    if (!x) {
      throw new Error("Cannot pop from the front of empty array.");
    }
    return x;
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

  const compareElements = (a: RuntimeObj, b: RuntimeObj): number => {
    const ltResult = k.callMethod(a, k.ltSymbol, [b]);
    if (k.isEqual(ltResult, k.trueObj)) return -1;
    const gtResult = k.callMethod(a, k.gtSymbol, [b]);
    if (k.isEqual(gtResult, k.trueObj)) return 1;
    return 0;
  };

  defMethod('sort!', 0, thisObj => {
    thisObj.elements.sort(compareElements);
    return thisObj;
  });

  defMethod('sort', 0, thisObj => makeListObj(thisObj.elements.toSorted(compareElements)));

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

  defMethod('join', 1, (thisObj, args) => {
    if (args[0].tag !== 'StringObj') {
      throw new Error(`join separator must be a string, got ${show(args[0])}`);
    }
    const separator = (args[0] as StringObj).value;
    const joined = thisObj.elements.map(e => {
      if (e.tag !== 'StringObj') {
        throw new Error(`join requires all elements to be strings, got ${show(e)}`);
      }
      return (e as StringObj).value;
    }).join(separator);
    return makeStringObj(joined);
  });
}
