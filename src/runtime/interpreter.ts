import { intern, type SymbolEnv } from "../bootstrap/symbol_env";
import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeIntObj, type IntTypeObj } from "../data_structures/int";
import { makeListObj, type ListTypeObj } from "../data_structures/list";
import { bindMethod, makeUnboundMethodObj, type UnboundMethodObj, type UnboundMethodTypeObj } from "../core_objects/unbound_method";
import { type ModuleObj } from "../core_objects/module";
import { defineBinding, getBinding, getBindingByName, makeScope, type Scope } from "./scope";
import { makeStringObj, type StringObj, type StringTypeObj } from "../data_structures/string";
import type { BoundMethodObj, BoundMethodTypeObj } from "../core_objects/bound_method";

export function makeInterpreter(env: SymbolEnv, sysModule: ModuleObj) {
  const {
    intTypeObj, stringTypeObj, listTypeObj, unboundMethodTypeObj,
    boundMethodTypeObj
   } = getCoreTypes();
  const { thisSym, showSym } = getCoreSymbols();

  function evaluate(expr: Expr, scope: Scope): RuntimeObj {
    switch (expr.type) {
      case 'int': {
        return makeIntObj(expr.value, intTypeObj);
      }

      case 'string': {
        return makeStringObj(expr.value, stringTypeObj);
      }

      case 'list': {
        const elements = expr.elements.map(e => evaluate(e, scope));
        return makeListObj(elements, listTypeObj);
      }

      case 'ident': {
        const value = getBinding(expr.sym, scope);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym)}`);
        }
        return value;
      }

      case 'methodDef': {
        const receiverType = getBinding(expr.receiverType, scope) as TypeObj;
        if (!receiverType) {
          throw new Error(`Unknown type ${expr.receiverType.name}`);
        }
        const methodObj = makeUnboundMethodObj(
          receiverType,
          expr.name,
          expr.params,
          expr.body,
          unboundMethodTypeObj,
          scope
        );
        receiverType.methods.set(expr.name, methodObj);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope);
        const method = receiver.type.methods.get(expr.fieldName);
        if (!method) {
          throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type)}`);
        }
        return bindMethod(method, receiver, boundMethodTypeObj);
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, scope) as BoundMethodObj;
        if (fn.tag !== 'BoundMethodObj') {
          throw new Error(`Cannot call ${show(fn)}`);
        }

        const args = expr.args.map(arg => evaluate(arg, scope));
        return callMethod(fn, args);
      }
    }

    const _exhaustive: never = expr;
  }

  function show(obj: RuntimeObj): string {
    const showMethod = obj.type.methods.get(showSym);
    if (!showMethod) {
      return `<${obj.tag}:noshow>`;
    }

    const boundMethod = bindMethod(showMethod, obj, boundMethodTypeObj);
    const result = callMethod(boundMethod, []) as StringObj;
    return result.value;
  }

  function getCoreTypes() {
    const intTypeObj = getBindingByName<IntTypeObj>('int', sysModule.toplevelScope, env)!;
    const stringTypeObj = getBindingByName<StringTypeObj>('string', sysModule.toplevelScope, env)!;
    const listTypeObj = getBindingByName<ListTypeObj>('list', sysModule.toplevelScope, env)!;
    const unboundMethodTypeObj = getBindingByName<UnboundMethodTypeObj>('unbound_method', sysModule.toplevelScope, env)!;
    const boundMethodTypeObj = getBindingByName<BoundMethodTypeObj>('method', sysModule.toplevelScope, env)!;

    return {
      intTypeObj, stringTypeObj, listTypeObj, unboundMethodTypeObj,
      boundMethodTypeObj,
    }
  }  

  function getCoreSymbols() {
    const thisSym = intern('this', env);
    const showSym = intern('show', env);
    return { thisSym, showSym }
  }

  function callMethod(method: BoundMethodObj, args: RuntimeObj[]): RuntimeObj {
    const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
    if (args.length !== expectedCount) {
      throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
    }

    if (method.mode === 'native') {
      return method.nativeFn(method.receiverInstance, args);
    }

    let callScope = makeScope(method.scopeClosure);
    defineBinding(thisSym, method.receiverInstance, callScope);
    for (let i = 0; i < method.argNames.length; i++) {
      defineBinding(method.argNames[i], args[i], callScope);
    }
    return evaluate(method.body, callScope);
  }

  return {
    evaluate, show, getCoreTypes, getCoreSymbols, callMethod,
    bindMethod: (method: UnboundMethodObj, receiver: RuntimeObj) =>
      bindMethod(method, receiver, boundMethodTypeObj),
  };
}
