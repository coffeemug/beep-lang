import { getThisObj, type Env } from "../env";
import { makeIntObj } from "./int";
import { nativeMethod } from "./methods";
import type { RuntimeObjMixin, TypeObjMixin } from "./mixins";
import { type RootTypeObj } from "./root_type"
import { makeStringObj } from "./string";
import type { SymbolObj } from "./symbol";
import type { RuntimeObj } from ".";
import { show } from "../interpreter";

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

export function registerListMethods(env: Env) {
  const listTypeObj = env.listTypeObj.deref()!;

  // show
  const mShow = nativeMethod(env, 'list', 'show', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    const elemStrs = thisObj.elements.map((e: RuntimeObj) => show(e, env));
    return makeStringObj(`[${elemStrs.join(', ')}]`, env.stringTypeObj.deref()!);
  });
  mShow.receiverType.methods.set(mShow.name, mShow);

  // push_back - returns new list with element added at end
  const mPushBack = nativeMethod(env, 'list', 'push', 1, (method, args) => {
    const thisObj = getThisObj<ListObj>(method, env);
    return makeListObj([...thisObj.elements, args[0]], listTypeObj);
  });
  mPushBack.receiverType.methods.set(mPushBack.name, mPushBack);

  // push_back! - mutates list, adds element at end
  const mPushBackMut = nativeMethod(env, 'list', 'push!', 1, (method, args) => {
    const thisObj = getThisObj<ListObj>(method, env);
    thisObj.elements.push(args[0]);
    return thisObj;
  });
  mPushBackMut.receiverType.methods.set(mPushBackMut.name, mPushBackMut);

  // pop_back - returns new list with last element removed
  const mPopBack = nativeMethod(env, 'list', 'pop', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    return makeListObj(thisObj.elements.slice(0, -1), listTypeObj);
  });
  mPopBack.receiverType.methods.set(mPopBack.name, mPopBack);

  // pop_back! - mutates list, removes last element
  const mPopBackMut = nativeMethod(env, 'list', 'pop!', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    thisObj.elements.pop();
    return thisObj;
  });
  mPopBackMut.receiverType.methods.set(mPopBackMut.name, mPopBackMut);

  // push_front - returns new list with element added at front
  const mPushFront = nativeMethod(env, 'list', 'push_front', 1, (method, args) => {
    const thisObj = getThisObj<ListObj>(method, env);
    return makeListObj([args[0], ...thisObj.elements], listTypeObj);
  });
  mPushFront.receiverType.methods.set(mPushFront.name, mPushFront);

  // push_front! - mutates list, adds element at front
  const mPushFrontMut = nativeMethod(env, 'list', 'push_front!', 1, (method, args) => {
    const thisObj = getThisObj<ListObj>(method, env);
    thisObj.elements.unshift(args[0]);
    return thisObj;
  });
  mPushFrontMut.receiverType.methods.set(mPushFrontMut.name, mPushFrontMut);

  // pop_front - returns new list with first element removed
  const mPopFront = nativeMethod(env, 'list', 'pop_front', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    return makeListObj(thisObj.elements.slice(1), listTypeObj);
  });
  mPopFront.receiverType.methods.set(mPopFront.name, mPopFront);

  // pop_front! - mutates list, removes first element
  const mPopFrontMut = nativeMethod(env, 'list', 'pop_front!', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    thisObj.elements.shift();
    return thisObj;
  });
  mPopFrontMut.receiverType.methods.set(mPopFrontMut.name, mPopFrontMut);

  // len - returns number of elements
  const mLen = nativeMethod(env, 'list', 'len', 0, (method) => {
    const thisObj = getThisObj<ListObj>(method, env);
    return makeIntObj(thisObj.elements.length, env.intTypeObj.deref()!);
  });
  mLen.receiverType.methods.set(mLen.name, mLen);
}
