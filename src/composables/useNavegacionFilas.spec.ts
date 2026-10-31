import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useNavegacionFilas } from './useNavegacionFilas';

const fila = (id: string) => `
  <tr>
    <td><a href="#${id}" class="nombre-expediente" data-id="${id}">${id}</a></td>
    <td><a href="#e${id}" class="btn-expediente">Expediente</a><button class="btn-editar">Editar</button></td>
  </tr>`;

describe('useNavegacionFilas', () => {
  let contenedor: HTMLDivElement;
  let cambiarPagina: ReturnType<typeof vi.fn>;
  let navegacion: ReturnType<typeof useNavegacionFilas>;

  const nombre = (id: string) => contenedor.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
  const buscador = () => contenedor.querySelector<HTMLInputElement>('.dt-search input')!;
  const presionar = (objetivo: HTMLElement, key: string, extra = {}) => {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
    objetivo.dispatchEvent(evento);
    return evento;
  };

  beforeEach(() => {
    contenedor = document.createElement('div');
    contenedor.innerHTML = `<div class="dt-search"><input type="search" /></div>
      <table><tbody>${fila('a')}${fila('b')}${fila('c')}</tbody></table>`;
    document.body.appendChild(contenedor);
    cambiarPagina = vi.fn(() => false);
    navegacion = useNavegacionFilas(ref(contenedor), cambiarPagina);
    contenedor.addEventListener('keydown', navegacion.alPresionar);
    contenedor.addEventListener('focusin', navegacion.alEnfocar);
    navegacion.sincronizar();
  });

  afterEach(() => contenedor.remove());

  it('Tab solo se detiene en la fila activa', () => {
    expect(nombre('a').hasAttribute('tabindex')).toBe(false);
    expect(nombre('b').tabIndex).toBe(-1);
    expect(contenedor.querySelectorAll<HTMLElement>('.btn-editar')[0].tabIndex).toBe(-1);
    expect(contenedor.querySelectorAll<HTMLElement>('.btn-expediente')[0].tabIndex).toBe(-1);
  });

  it('las flechas recorren las filas y la activa cambia con el foco', () => {
    nombre('a').focus();
    expect(presionar(nombre('a'), 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(nombre('b'));
    expect(nombre('b').hasAttribute('tabindex')).toBe(false);
    expect(nombre('a').tabIndex).toBe(-1);
  });

  it('Inicio y Fin van a los extremos', () => {
    nombre('b').focus();
    presionar(nombre('b'), 'End');
    expect(document.activeElement).toBe(nombre('c'));
    presionar(nombre('c'), 'Home');
    expect(document.activeElement).toBe(nombre('a'));
  });

  it('subir desde la primera fila lleva al buscador, y bajar regresa', () => {
    nombre('a').focus();
    presionar(nombre('a'), 'ArrowUp');
    expect(document.activeElement).toBe(buscador());
    presionar(buscador(), 'ArrowDown');
    expect(document.activeElement).toBe(nombre('a'));
  });

  it('una letra pasa al buscador con esa letra', () => {
    const alEscribir = vi.fn();
    buscador().addEventListener('input', alEscribir);
    nombre('b').focus();
    presionar(nombre('b'), 'g');
    expect(document.activeElement).toBe(buscador());
    expect(buscador().value).toBe('g');
    expect(alEscribir).toHaveBeenCalledOnce();
  });

  it('Av Pág cambia de página y va a la primera fila; sin más páginas no se mueve', () => {
    nombre('b').focus();
    presionar(nombre('b'), 'PageDown');
    expect(cambiarPagina).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(nombre('b'));

    cambiarPagina.mockReturnValue(true);
    presionar(nombre('b'), 'PageUp');
    expect(cambiarPagina).toHaveBeenCalledWith(-1);
    expect(document.activeElement).toBe(nombre('a'));
  });

  it('tras redibujar conserva la fila activa, o usa la primera si ya no está', () => {
    nombre('c').focus();
    navegacion.sincronizar();
    expect(nombre('c').hasAttribute('tabindex')).toBe(false);

    contenedor.querySelector('tbody')!.innerHTML = fila('x') + fila('y');
    navegacion.sincronizar();
    expect(nombre('x').hasAttribute('tabindex')).toBe(false);
    expect(nombre('y').tabIndex).toBe(-1);
  });

  it('→ y ← recorren las acciones y regresan al nombre', () => {
    const expediente = contenedor.querySelector<HTMLElement>('.btn-expediente')!;
    const editar = contenedor.querySelector<HTMLElement>('.btn-editar')!;
    nombre('a').focus();
    presionar(nombre('a'), 'ArrowRight');
    expect(document.activeElement).toBe(expediente);
    presionar(expediente, 'ArrowRight');
    expect(document.activeElement).toBe(editar);
    presionar(editar, 'ArrowRight');
    expect(document.activeElement).toBe(editar);
    presionar(editar, 'ArrowLeft');
    presionar(expediente, 'ArrowLeft');
    expect(document.activeElement).toBe(nombre('a'));
  });

  it('↑ y ↓ pasan a la misma acción de la fila vecina, sin salir de la página', () => {
    const editar = () => contenedor.querySelectorAll<HTMLElement>('.btn-editar');
    editar()[0].focus();
    presionar(editar()[0], 'ArrowDown');
    expect(document.activeElement).toBe(editar()[1]);
    presionar(editar()[1], 'ArrowDown');
    presionar(editar()[2], 'ArrowDown');
    expect(document.activeElement).toBe(editar()[2]);
    presionar(editar()[2], 'ArrowUp');
    expect(document.activeElement).toBe(editar()[1]);
  });

  it('si la fila vecina no tiene esa acción, usa la que ocupa su lugar', () => {
    const editar = contenedor.querySelector<HTMLElement>('.btn-editar')!;
    const segunda = nombre('b').closest('tr')!;
    segunda.querySelector('.btn-editar')!.className = 'btn-fusionar';
    editar.focus();
    presionar(editar, 'ArrowDown');
    expect(document.activeElement).toBe(segunda.querySelector('.btn-fusionar'));
  });

  it('Esc regresa de las acciones al nombre', () => {
    const editar = contenedor.querySelector<HTMLElement>('.btn-editar')!;
    editar.focus();
    presionar(editar, 'Escape');
    expect(document.activeElement).toBe(nombre('a'));
  });

  it('las acciones se recorren en el orden en que se ven, sin las deshabilitadas', () => {
    const renglon = nombre('a').closest('tr')!;
    const lados: Record<string, number> = { 'btn-expediente': 200, 'btn-editar': 100 };
    for (const [clase, left] of Object.entries(lados)) {
      vi.spyOn(renglon.querySelector(`.${clase}`)!, 'getBoundingClientRect').mockReturnValue({ left } as DOMRect);
    }
    const eliminar = document.createElement('button');
    eliminar.disabled = true;
    renglon.lastElementChild!.appendChild(eliminar);
    nombre('a').focus();
    presionar(nombre('a'), 'ArrowRight');
    expect(document.activeElement).toBe(renglon.querySelector('.btn-editar'));
  });

  describe('foco al cerrar una ventana', () => {
    const abrirEditar = () => {
      const editar = contenedor.querySelector<HTMLElement>('.btn-editar')!;
      editar.focus();
      presionar(editar, 'Enter');
      editar.blur();
    };

    it('regresa a la fila desde la que se abrió con el teclado', () => {
      abrirEditar();
      navegacion.devolverFoco();
      expect(document.activeElement).toBe(nombre('a'));
    });

    it('también si la tabla se redibuja después de cerrar', () => {
      abrirEditar();
      navegacion.devolverFoco();
      contenedor.querySelector('tbody')!.innerHTML = fila('a') + fila('b');
      expect(document.activeElement).toBe(document.body);
      navegacion.sincronizar();
      expect(document.activeElement).toBe(nombre('a'));
    });

    it('con el mouse no mueve el foco', () => {
      contenedor.querySelector<HTMLElement>('.btn-editar')!.click();
      navegacion.devolverFoco();
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('primera flecha en la página', () => {
    const flecha = (key = 'ArrowDown', extra = {}) => {
      const evento = new KeyboardEvent('keydown', { key, cancelable: true, ...extra });
      navegacion.alPresionarEnPagina(evento);
      return evento;
    };

    it('sin nada enfocado lleva a la primera fila, con cualquier flecha', () => {
      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
        (document.activeElement as HTMLElement).blur();
        expect(flecha(key).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(nombre('a'));
      }
    });

    it('desde un botón de la página también', () => {
      const boton = document.createElement('button');
      document.body.appendChild(boton);
      boton.focus();
      flecha();
      expect(document.activeElement).toBe(nombre('a'));
      boton.remove();
    });

    it('regresa a la última fila en la que se estuvo', () => {
      nombre('b').focus();
      nombre('b').blur();
      flecha();
      expect(document.activeElement).toBe(nombre('b'));
    });

    it('no toma las flechas de un campo, de la tabla, de una ventana ni de un atajo', () => {
      buscador().focus();
      expect(flecha().defaultPrevented).toBe(false);
      nombre('b').focus();
      expect(flecha().defaultPrevented).toBe(false);
      (document.activeElement as HTMLElement).blur();
      expect(flecha('ArrowDown', { altKey: true }).defaultPrevented).toBe(false);
      expect(flecha('Enter').defaultPrevented).toBe(false);

      const ventana = document.createElement('div');
      ventana.className = 'modal-work-overlay';
      document.body.appendChild(ventana);
      expect(flecha().defaultPrevented).toBe(false);
      ventana.remove();
    });

    it('sin filas no hace nada', () => {
      contenedor.querySelector('tbody')!.innerHTML = '';
      navegacion.sincronizar();
      expect(flecha().defaultPrevented).toBe(false);
    });
  });

  it('en los botones, con atajos o con una ventana abierta no hace nada', () => {
    const editar = contenedor.querySelector<HTMLElement>('.btn-editar')!;
    expect(presionar(editar, 'Home').defaultPrevented).toBe(false);
    expect(presionar(editar, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(false);
    expect(presionar(nombre('a'), 'ArrowDown', { altKey: true }).defaultPrevented).toBe(false);
    expect(presionar(nombre('a'), 'k', { ctrlKey: true }).defaultPrevented).toBe(false);

    const ventana = document.createElement('div');
    ventana.className = 'modal-work-overlay';
    document.body.appendChild(ventana);
    expect(presionar(nombre('a'), 'ArrowDown').defaultPrevented).toBe(false);
    ventana.remove();
  });
});
