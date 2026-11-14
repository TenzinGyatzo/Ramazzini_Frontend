import { useTrabajadoresStore } from '@/stores/trabajadores';
import { valorDePartida, type CampoConValorDePartida } from '@/helpers/valorDePartida';

/** Valor de partida de las flechas para el trabajador actual (peso, altura y cintura según su sexo). */
export function useValorDePartida() {
  const trabajadores = useTrabajadoresStore();
  return (campo: CampoConValorDePartida) => valorDePartida(campo, trabajadores.currentTrabajador?.sexo);
}
