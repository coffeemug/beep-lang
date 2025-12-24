import { findSymbolByName, intern, intern_, type SymbolEnv } from "../bootstrap/symbol_env";
import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeIntObj, type IntTypeObj } from "../data_structures/int";
import { makeListObj, type ListTypeObj } from "../data_structures/list";
import { bindMethod, makeUnboundMethodObj, type UnboundMethodObj, type UnboundMethodTypeObj } from "../core_objects/unbound_method";
import { defineBinding, getBinding, getBindingByName, type ModuleObj } from "../core_objects/module";
import { withFrame } from "./frame";
import { makeStringObj, type StringObj, type StringTypeObj } from "../data_structures/string";
import type { BoundMethodObj, BoundMethodTypeObj } from "../core_objects/bound_method";

export function makeInterpreter(env: SymbolEnv, sysModule: ModuleObj) {
  const {
    intTypeObj, stringTypeObj, listTypeObj, unboundMethodTypeObj,
    boundMethodTypeObj
   } = getCoreTypes();
  const { thisSym, showSym } = getCoreSymbols();

  function evaluate(expr: Expr, m: ModuleObj): RuntimeObj {
    switch (expr.type) {
      case 'int': {
        return makeIntObj(expr.value, intTypeObj);
      }

      case 'string': {
        return makeStringObj(expr.value, stringTypeObj);
      }

      case 'list': {
        const elements = expr.elements.map(e => evaluate(e, m));
        return makeListObj(elements, listTypeObj);
      }

      case 'ident': {
        const value = getBinding(expr.sym, m);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym)}`);
        }
        return value;
      }

      case 'methodDef': {
        const receiverType = getBinding(expr.receiverType, m) as TypeObj;
        if (!receiverType) {
          throw new Error(`Unknown type ${expr.receiverType.name}`);
        }
        const methodObj = makeUnboundMethodObj(
          receiverType,
          expr.name,
          expr.params,
          expr.body,
          unboundMethodTypeObj,
          m.topFrame
        );
        receiverType.methods.set(expr.name, methodObj);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, m);
        const method = receiver.type.methods.get(expr.fieldName);
        if (!method) {
          throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type)}`);
        }
        return bindMethod(method, receiver, boundMethodTypeObj);
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, m) as BoundMethodObj;
        if (fn.tag !== 'BoundMethodObj') {
          throw new Error(`Cannot call ${show(fn)}`);
        }

        const args = expr.args.map(arg => evaluate(arg, m));
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
    const intTypeObj = getBindingByName<IntTypeObj>('int', sysModule, env)!;
    const stringTypeObj = getBindingByName<StringTypeObj>('string', sysModule, env)!;
    const listTypeObj = getBindingByName<ListTypeObj>('list', sysModule, env)!;
    const unboundMethodTypeObj = getBindingByName<UnboundMethodTypeObj>('unbound_method', sysModule, env)!;
    const boundMethodTypeObj = getBindingByName<BoundMethodTypeObj>('bound_method', sysModule, env)!;

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

    const module = method.receiverType.bindingModule;
    return withFrame(module, method.frameClosure, () => {
      defineBinding(thisSym, method.receiverInstance, module);
      for (let i = 0; i < method.argNames.length; i++) {
        defineBinding(method.argNames[i], args[i], module);
      }
      return evaluate(method.body, module);
    });
  }

  return {
    evaluate, show, getCoreTypes, getCoreSymbols, callMethod,
    bindMethod: (method: UnboundMethodObj, receiver: RuntimeObj) =>
      bindMethod(method, receiver, boundMethodTypeObj),
  };
}
