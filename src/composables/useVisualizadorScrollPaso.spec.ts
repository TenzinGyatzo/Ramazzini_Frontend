import { describe, expect, it, vi } from 'vitest';
import { scrollVisualizadorAPaso } from './useVisualizadorScrollPaso';

function makeRoot(paso: string) {
  const root = document.createElement('div');
  const anchor = document.createElement('section');
  anchor.setAttribute('data-paso', paso);
  root.appendChild(anchor);
  root.scrollTo = vi.fn();
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
    top: 100,
  } as DOMRect);
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
    top: 280,
  } as DOMRect);
  Object.defineProperty(root, 'scrollTop', { value: 40, writable: true });
  return { root, anchor };
}

describe('scrollVisualizadorAPaso', () => {
  it('hace scroll suave al bloque data-paso', () => {
    const { root } = makeRoot('3');
    expect(scrollVisualizadorAPaso(root, 3)).toBe(true);
    expect(root.scrollTo).toHaveBeenCalledWith({
      top: 212,
      behavior: 'smooth',
    });
  });

  it('no hace nada si no hay ancla', () => {
    const { root } = makeRoot('1');
    expect(scrollVisualizadorAPaso(root, 9)).toBe(false);
    expect(root.scrollTo).not.toHaveBeenCalled();
  });

  it('encuentra anclas numéricas aunque exista CSS.escape', () => {
    const { root } = makeRoot('12');
    expect(scrollVisualizadorAPaso(root, 12)).toBe(true);
    expect(root.scrollTo).toHaveBeenCalled();
  });
});
