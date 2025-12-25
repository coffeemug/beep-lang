import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { type RootTypeObj } from "../core_objects/root_type"
import type { RuntimeObj } from "../runtime_objects";
import { defineBinding } from "../runtime/scope";
import type { BeepKernel } from "../bootstrap/kernel";

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
  const { makeUnboundNativeMethodObj, makeStringObj, makeListObj,
    listTypeObj, intern, makeIntObj, show, } = k;
  const scope = k.sysModule.toplevelScope;

  // show
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('show'), 0, thisObj => {
    const items = thisObj.elements.map(e => show(e)).join(', ');
    return makeStringObj(`[${items}]`);
  });

  // push - returns new list with element added at end
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('push'), 1, (thisObj, args) =>
    makeListObj([...thisObj.elements, args[0]]));

  // push! - mutates list, adds element at end
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('push!'), 1, (thisObj, args) => {
    thisObj.elements.push(args[0]);
    return thisObj;
  });

  // pop - returns new list with last element removed
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('pop'), 0, thisObj =>
    makeListObj(thisObj.elements.slice(0, -1)));

  // pop! - mutates list, removes last element
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('pop!'), 0, thisObj => {
    thisObj.elements.pop();
    return thisObj;
  });

  // push_front - returns new list with element added at front
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('push_front'), 1, (thisObj, args) =>
    makeListObj([args[0], ...thisObj.elements]));

  // push_front! - mutates list, adds element at front
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('push_front!'), 1, (thisObj, args) => {
    thisObj.elements.unshift(args[0]);
    return thisObj;
  });

  // pop_front - returns new list with first element removed
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('pop_front'), 0, thisObj =>
    makeListObj(thisObj.elements.slice(1)));

  // pop_front! - mutates list, removes first element
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('pop_front!'), 0, thisObj => {
    thisObj.elements.shift();
    return thisObj;
  });

  // len - returns number of elements
  makeUnboundNativeMethodObj<ListObj>(scope, listTypeObj, intern('len'), 0, thisObj =>
    makeIntObj(thisObj.elements.length));
}
