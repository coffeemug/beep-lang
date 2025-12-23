import type { SymbolId } from './bootstrap/symbol_env';
import type { RuntimeObj } from './runtime_objs';
import type { ModuleObj } from './runtime_objs/module';

export type Frame = {
  bindings: Map<SymbolId, RuntimeObj>,
  parent: Frame | null,
}

export function makeFrame(parent?: Frame): Frame {
  return {
    bindings: new Map(),
    parent: parent ?? null,
  }
}

export function pushFrame(m: ModuleObj): Frame {
  m.topFrame = makeFrame(m.topFrame);
  return m.topFrame;
}

export function popFrame(m: ModuleObj) {
  if (!m.topFrame.parent) {
    throw new Error("This should never happen!")
  }
  m.topFrame = m.topFrame.parent;
}

export function withFrame<T>(m: ModuleObj, parent: Frame, fn: () => T): T {
  const savedFrame = m.topFrame;
  m.topFrame = makeFrame(parent);
  try {
    return fn();
  } finally {
    m.topFrame = savedFrame;
  }
}
