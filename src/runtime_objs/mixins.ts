import type { TypeObj } from ".";

export type RuntimeObjMixin<Tag extends string, T extends TypeObj> = {
  /* Fields common to every runtime object */
  tag: Tag,
  type: T,
}

export type TypeObjMixin = {
  /* Fields common to every type object */
  methods: MethodsMap,
}

export type MethodsMap = Map<string, null>;
