import type { RuntimeObjMixin, TypeObjMixin } from "../bootstrap/object_mixins";
import { type RootTypeObj } from "../bootstrap/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { defineBinding } from "../bootstrap/scope";
import type { BeepKernel } from "../bootstrap/kernel";
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

export function initList(k: BeepKernel) {
  const { rootTypeObj, intern } = k;
  const listTypeObj: ListTypeObj = {
    tag: 'ListTypeObj',
    type: rootTypeObj,
    name: intern('list'),
    methods: new Map(),
  };
  defineBinding(listTypeObj.name, listTypeObj, k.sysModule.toplevelScope);

  k.listTypeObj = listTypeObj;
  k.makeListObj = (elements: RuntimeObj[]): ListObj => ({
    tag: 'ListObj',
    type: listTypeObj,
    elements,
  });
}

export function initListMethods(k: BeepKernel) {
  const {
    makeStringObj, makeListObj, listTypeObj, makeIntObj,
    show, makeDefNative
  } = k;

  const defMethod = makeDefNative<ListObj>(k.sysModule.toplevelScope, listTypeObj)

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
    makeIntObj(thisObj.elements.length));

  defMethod('at', 1, (thisObj, args) =>
    thisObj.elements[(args[0] as IntObj).value]);
}
