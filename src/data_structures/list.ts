import { makeIntObj, type IntTypeObj } from "./int";
import { nativeMethod } from "../core_objects/methods";
import type { RuntimeObjMixin, TypeObjMixin } from "../core_objects/object_mixins";
import { type RootTypeObj } from "../core_objects/root_type"
import { makeStringObj, type StringTypeObj } from "./string";
import type { SymbolObj } from "../core_objects/symbol";
import type { RuntimeObj } from "../runtime_objects";
import { type SymbolEnv } from "../bootstrap/symbol_env";
import { getBindingByName, type ModuleObj } from "../core_objects/module";

export type ListTypeObj =
  & RuntimeObjMixin<'ListTypeObj', RootTypeObj>
  & TypeObjMixin
  & {}

export type ListObj =
  & RuntimeObjMixin<'ListObj', ListTypeObj>
  & {
    elements: RuntimeObj[],
  }

export function makeListTypeObj(name: SymbolObj, rootTypeObj: RootTypeObj): ListTypeObj {
  return {
    tag: 'ListTypeObj',
    type: rootTypeObj,
    name,
    methods: new Map(),
  };
}

export function makeListObj(elements: RuntimeObj[], listTypeObj: ListTypeObj): ListObj {
  return {
    tag: 'ListObj',
    type: listTypeObj,
    elements,
  };
}

export function registerListMethods(m: ModuleObj, env: SymbolEnv) {
  const listTypeObj = getBindingByName<ListTypeObj>('list', m, env)!;
  const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;
  const intTypeObj = getBindingByName<IntTypeObj>('int', m, env)!

  // show
  const mShow = nativeMethod<ListObj>(m, env, 'list', 'show', 0, _thisObj => {
    // TODO: Implement - need access to show function
    return makeStringObj(`[TODO: Implement]`, stringTypeObj);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);

  // push_back - returns new list with element added at end
  const mPushBack = nativeMethod<ListObj>(m, env, 'list', 'push', 1, (thisObj, args) =>
    makeListObj([...thisObj.elements, args[0]], listTypeObj));
  mPushBack.receiverType.methods.set(mPushBack.name, mPushBack);

  // push_back! - mutates list, adds element at end
  const mPushBackMut = nativeMethod<ListObj>(m, env, 'list', 'push!', 1, (thisObj, args) => {
    thisObj.elements.push(args[0]);
    return thisObj;
  });
  mPushBackMut.receiverType.methods.set(mPushBackMut.name, mPushBackMut);

  // pop_back - returns new list with last element removed
  const mPopBack = nativeMethod<ListObj>(m, env, 'list', 'pop', 0, thisObj =>
    makeListObj(thisObj.elements.slice(0, -1), listTypeObj));
  mPopBack.receiverType.methods.set(mPopBack.name, mPopBack);

  // pop_back! - mutates list, removes last element
  const mPopBackMut = nativeMethod<ListObj>(m, env, 'list', 'pop!', 0, thisObj => {
    thisObj.elements.pop();
    return thisObj;
  });
  mPopBackMut.receiverType.methods.set(mPopBackMut.name, mPopBackMut);

  // push_front - returns new list with element added at front
  const mPushFront = nativeMethod<ListObj>(m, env, 'list', 'push_front', 1, (thisObj, args) =>
    makeListObj([args[0], ...thisObj.elements], listTypeObj));
  mPushFront.receiverType.methods.set(mPushFront.name, mPushFront);

  // push_front! - mutates list, adds element at front
  const mPushFrontMut = nativeMethod<ListObj>(m, env, 'list', 'push_front!', 1, (thisObj, args) => {
    thisObj.elements.unshift(args[0]);
    return thisObj;
  });
  mPushFrontMut.receiverType.methods.set(mPushFrontMut.name, mPushFrontMut);

  // pop_front - returns new list with first element removed
  const mPopFront = nativeMethod<ListObj>(m, env, 'list', 'pop_front', 0, thisObj =>
    makeListObj(thisObj.elements.slice(1), listTypeObj));
  mPopFront.receiverType.methods.set(mPopFront.name, mPopFront);

  // pop_front! - mutates list, removes first element
  const mPopFrontMut = nativeMethod<ListObj>(m, env, 'list', 'pop_front!', 0, thisObj => {
    thisObj.elements.shift();
    return thisObj;
  });
  mPopFrontMut.receiverType.methods.set(mPopFrontMut.name, mPopFrontMut);

  // len - returns number of elements
  const mLen = nativeMethod<ListObj>(m, env, 'list', 'len', 0, thisObj =>
    makeIntObj(thisObj.elements.length, intTypeObj));
  mLen.receiverType.methods.set(mLen.name, mLen);
}
