/**
 * Operaciones del «modo organizar» de un año del expediente. Todas son puras: reciben la
 * estructura del año (documentos sueltos y subgrupos) y devuelven una nueva.
 */
import {
  referenciaDe,
  type DocumentoDelExpediente,
  type ElementoDelAnio,
  type OrganizacionDelAnio,
  type SubgrupoDelAnio,
} from './documentosExpediente';

export const NOMBRE_SUBGRUPO_POR_DEFECTO = 'Nuevo subgrupo';
export const MAX_LONGITUD_NOMBRE_SUBGRUPO = 60;

/** Copia la estructura para editarla sin tocar la que está en pantalla. */
export const copiarEstructura = (elementos: readonly ElementoDelAnio[]): ElementoDelAnio[] =>
  elementos.map((elemento) =>
    elemento.clase === 'subgrupo' ? { ...elemento, documentos: [...elemento.documentos] } : { ...elemento },
  );

/**
 * Copia para empezar a organizar: los subgrupos automáticos pasan a ser del usuario, porque
 * al guardar el año queda tal como se ve.
 */
export const copiarParaOrganizar = (elementos: readonly ElementoDelAnio[]): ElementoDelAnio[] =>
  copiarEstructura(elementos).map((elemento) =>
    elemento.clase === 'subgrupo' ? { ...elemento, automatico: false } : elemento,
  );

const esSubgrupo = (elemento: ElementoDelAnio | undefined): elemento is SubgrupoDelAnio =>
  elemento?.clase === 'subgrupo';

/** Dónde está un documento: su posición en el año y, si aplica, dentro de su subgrupo. */
function ubicar(elementos: readonly ElementoDelAnio[], item: DocumentoDelExpediente) {
  for (let indice = 0; indice < elementos.length; indice++) {
    const elemento = elementos[indice];
    if (elemento.clase === 'documento') {
      if (elemento.item === item) return { indice, subgrupo: null, posicion: -1 };
    } else {
      const posicion = elemento.documentos.indexOf(item);
      if (posicion >= 0) return { indice, subgrupo: elemento, posicion };
    }
  }
  return null;
}

export const subgrupoDe = (elementos: readonly ElementoDelAnio[], item: DocumentoDelExpediente) =>
  ubicar(elementos, item)?.subgrupo ?? null;

/** Saca el documento de donde esté; devuelve la estructura sin él. */
function retirar(elementos: readonly ElementoDelAnio[], item: DocumentoDelExpediente): ElementoDelAnio[] {
  const copia = copiarEstructura(elementos);
  const lugar = ubicar(copia, item);
  if (!lugar) return copia;
  if (lugar.subgrupo) lugar.subgrupo.documentos.splice(lugar.posicion, 1);
  else copia.splice(lugar.indice, 1);
  return copia;
}

/** ¿Puede el documento subir (-1) o bajar (+1) un paso? Solo se topa en los extremos del año. */
export function puedeMoverDocumento(
  elementos: readonly ElementoDelAnio[],
  item: DocumentoDelExpediente,
  paso: -1 | 1,
): boolean {
  const lugar = ubicar(elementos, item);
  if (!lugar) return false;
  if (lugar.subgrupo) return true;
  return paso === -1 ? lugar.indice > 0 : lugar.indice < elementos.length - 1;
}

/**
 * Mueve un documento un paso. Al toparse con un subgrupo entra en él, y al pasar el borde
 * del suyo sale y queda suelto junto al subgrupo.
 */
export function moverDocumento(
  elementos: readonly ElementoDelAnio[],
  item: DocumentoDelExpediente,
  paso: -1 | 1,
): ElementoDelAnio[] {
  if (!puedeMoverDocumento(elementos, item, paso)) return [...elementos];
  const copia = copiarEstructura(elementos);
  const lugar = ubicar(copia, item)!;

  if (lugar.subgrupo) {
    const documentos = lugar.subgrupo.documentos;
    const destino = lugar.posicion + paso;
    documentos.splice(lugar.posicion, 1);
    if (destino >= 0 && destino <= documentos.length) {
      documentos.splice(destino, 0, item);
    } else {
      copia.splice(paso === -1 ? lugar.indice : lugar.indice + 1, 0, { clase: 'documento', item });
    }
    return copia;
  }

  const vecino = copia[lugar.indice + paso];
  if (esSubgrupo(vecino)) {
    copia.splice(lugar.indice, 1);
    if (paso === 1) vecino.documentos.unshift(item);
    else vecino.documentos.push(item);
    return copia;
  }
  copia.splice(lugar.indice, 1);
  copia.splice(lugar.indice + paso, 0, { clase: 'documento', item });
  return copia;
}

/**
 * Coloca un documento donde se soltó al arrastrarlo: dentro de un subgrupo o suelto en el
 * año (`null`), en la posición indicada entre los elementos de ese contenedor.
 */
export function colocarDocumentoEn(
  elementos: readonly ElementoDelAnio[],
  item: DocumentoDelExpediente,
  subgrupoId: string | null,
  posicion: number,
): ElementoDelAnio[] {
  if (!ubicar(elementos, item)) return [...elementos];
  const copia = retirar(elementos, item);
  if (!subgrupoId) {
    copia.splice(Math.min(Math.max(posicion, 0), copia.length), 0, { clase: 'documento', item });
    return copia;
  }
  const destino = copia.find((elemento) => esSubgrupo(elemento) && elemento.id === subgrupoId);
  if (!esSubgrupo(destino)) return [...elementos];
  destino.documentos.splice(Math.min(Math.max(posicion, 0), destino.documentos.length), 0, item);
  return copia;
}

/**
 * Pasa un documento a un subgrupo (al final) o lo deja suelto (`null`), junto al subgrupo
 * del que sale.
 */
export function moverASubgrupo(
  elementos: readonly ElementoDelAnio[],
  item: DocumentoDelExpediente,
  subgrupoId: string | null,
): ElementoDelAnio[] {
  const origen = ubicar(elementos, item);
  if (!origen || (origen.subgrupo?.id ?? null) === subgrupoId) return [...elementos];

  const copia = retirar(elementos, item);
  if (subgrupoId) {
    const destino = copia.find((elemento) => esSubgrupo(elemento) && elemento.id === subgrupoId);
    if (!esSubgrupo(destino)) return [...elementos];
    destino.documentos.push(item);
    return copia;
  }
  const indiceDelSubgrupo = copia.findIndex((elemento) => esSubgrupo(elemento) && elemento.id === origen.subgrupo!.id);
  copia.splice(indiceDelSubgrupo + 1, 0, { clase: 'documento', item });
  return copia;
}

export function crearSubgrupo(elementos: readonly ElementoDelAnio[], id: string, nombre = NOMBRE_SUBGRUPO_POR_DEFECTO) {
  return [{ clase: 'subgrupo', id, nombre, documentos: [] } as SubgrupoDelAnio, ...copiarEstructura(elementos)];
}

export function renombrarSubgrupo(elementos: readonly ElementoDelAnio[], id: string, nombre: string): ElementoDelAnio[] {
  return copiarEstructura(elementos).map((elemento) =>
    esSubgrupo(elemento) && elemento.id === id
      ? { ...elemento, nombre: nombre.slice(0, MAX_LONGITUD_NOMBRE_SUBGRUPO) }
      : elemento,
  );
}

/** Quita el subgrupo; sus documentos quedan sueltos en el mismo lugar y orden. */
export function quitarSubgrupo(elementos: readonly ElementoDelAnio[], id: string): ElementoDelAnio[] {
  return copiarEstructura(elementos).flatMap((elemento): ElementoDelAnio[] =>
    esSubgrupo(elemento) && elemento.id === id
      ? elemento.documentos.map((item) => ({ clase: 'documento', item }))
      : [elemento],
  );
}

/** Mueve el subgrupo completo un lugar arriba o abajo entre los elementos del año. */
export function moverSubgrupo(elementos: readonly ElementoDelAnio[], id: string, paso: -1 | 1): ElementoDelAnio[] {
  const copia = copiarEstructura(elementos);
  const indice = copia.findIndex((elemento) => esSubgrupo(elemento) && elemento.id === id);
  const destino = indice + paso;
  if (indice < 0 || destino < 0 || destino >= copia.length) return copia;
  const [subgrupo] = copia.splice(indice, 1);
  copia.splice(destino, 0, subgrupo);
  return copia;
}

/** Coloca el subgrupo completo en la posición donde se soltó, entre los elementos del año. */
export function colocarSubgrupoEn(elementos: readonly ElementoDelAnio[], id: string, indiceDestino: number) {
  const copia = copiarEstructura(elementos);
  const indice = copia.findIndex((elemento) => esSubgrupo(elemento) && elemento.id === id);
  if (indice < 0 || indiceDestino < 0 || indiceDestino >= copia.length || indice === indiceDestino) return copia;
  const [subgrupo] = copia.splice(indice, 1);
  copia.splice(indiceDestino, 0, subgrupo);
  return copia;
}

/**
 * Lo que se guarda de la estructura: el orden completo del año, con el subgrupo de cada
 * documento, y todos los subgrupos con su lugar (también los vacíos, que alguien puede
 * preparar antes de crear o subir los documentos). Uno sin nombre toma el nombre por defecto.
 */
export function organizacionDe(elementos: readonly ElementoDelAnio[]): Required<OrganizacionDelAnio> {
  const organizacion: Required<OrganizacionDelAnio> = { orden: [], subgrupos: [] };
  elementos.forEach((elemento, posicion) => {
    if (elemento.clase === 'documento') {
      if (elemento.item.documento._id) organizacion.orden.push(referenciaDe(elemento.item));
      return;
    }
    organizacion.subgrupos.push({
      id: elemento.id,
      nombre: elemento.nombre.trim() || NOMBRE_SUBGRUPO_POR_DEFECTO,
      posicion,
    });
    elemento.documentos
      .filter((item) => item.documento._id)
      .forEach((item) => organizacion.orden.push({ ...referenciaDe(item), subgrupoId: elemento.id }));
  });
  return organizacion;
}

/** Huella de la organización, para saber si dos estructuras guardarían lo mismo. */
export const huellaDe = (elementos: readonly ElementoDelAnio[]): string => JSON.stringify(organizacionDe(elementos));
