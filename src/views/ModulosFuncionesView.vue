<script setup lang="ts">
/**
 * «Módulos y funciones» (docs/modulos-y-funciones-especificacion.md): primero las funciones, que
 * se aplican en toda la organización, y después los módulos, que se activan y luego se elige dónde
 * se usan. Cada interruptor se guarda al instante por su propia ruta.
 */
import { computed, inject, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import FormatosFirmadosAPI from '@/api/FormatosFirmadosAPI';
import InventarioAPI from '@/api/InventarioAPI';
import ModulosFuncionesAPI, {
  type EmpresaIncapacidades,
  type EstadoModulosFunciones,
} from '@/api/ModulosFuncionesAPI';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { useInventarioStore } from '@/stores/inventario';
import { useIncapacidadesStore } from '@/stores/incapacidades';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import type { EmpresaCentrosInventario } from '@/interfaces/inventario.interface';

type Interruptor = 'firma' | 'semaforizacion' | 'inventario' | 'incapacidades';

const toast: any = inject('toast');
const userStore = useUserStore();
const inventarioStore = useInventarioStore();
const incapacidadesStore = useIncapacidadesStore();
const proveedorSaludStore = useProveedorSaludStore();

const estado = ref<EstadoModulosFunciones | null>(null);
const cargando = ref(true);
const errorCarga = ref('');
const guardando = ref<Interruptor | null>(null);

const puedeConfigurar = computed(
  () => userStore.user?.role === 'Principal' || userStore.user?.role === 'Administrador',
);

// ---- Inventario por centro de trabajo (docs/modulos-y-funciones-especificacion.md, 3)
const empresasInventario = ref<EmpresaCentrosInventario[]>([]);
const panelCentros = ref(false);
const busquedaCentro = ref('');
const guardandoCentro = ref<string | null>(null);
const guardandoAntidoping = ref(false);

const centrosTotales = computed(() => empresasInventario.value.reduce((t, e) => t + e.centros.length, 0));
const centrosActivos = computed(() =>
  empresasInventario.value.reduce((t, e) => t + e.centros.filter((c) => c.inventarioHabilitado).length, 0),
);

/** Sin acentos ni mayúsculas, para que «planta» encuentre «PLANTA Tijuana». */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Filas «Empresa · Centro»; la búsqueda mira los dos nombres. */
const filasCentros = computed(() => {
  const consulta = normalizar(busquedaCentro.value.trim());
  return empresasInventario.value.flatMap((empresa) =>
    empresa.centros
      .filter(
        (centro) =>
          !consulta ||
          normalizar(`${empresa.nombreEmpresa} ${centro.nombreCentro}`).includes(consulta),
      )
      .map((centro) => ({ ...centro, nombreEmpresa: empresa.nombreEmpresa })),
  );
});

async function cargarCentrosInventario() {
  if (!puedeConfigurar.value) return;
  try {
    const { data } = await InventarioAPI.getCentros();
    empresasInventario.value = data;
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudieron cargar los centros de trabajo.'), type: 'error' });
  }
}

async function cambiarCentro(idCentroTrabajo: string, inventarioHabilitado: boolean) {
  if (guardandoCentro.value || !puedeConfigurar.value) return;
  guardandoCentro.value = idCentroTrabajo;
  try {
    const { data } = await InventarioAPI.updateCentros([{ idCentroTrabajo, inventarioHabilitado }]);
    empresasInventario.value = data;
    // El resto de la app (centros, nota médica) consulta esta lista
    await inventarioStore.cargarConfiguracion(true);
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudo guardar el centro.'), type: 'error' });
  } finally {
    guardandoCentro.value = null;
  }
}

async function cambiarAntidoping() {
  if (!estado.value || guardandoAntidoping.value || !puedeConfigurar.value) return;
  const activar = !estado.value.inventarioControlaAntidoping;
  guardandoAntidoping.value = true;
  try {
    await inventarioStore.guardarConfiguracion({ inventarioControlaAntidoping: activar });
    estado.value.inventarioControlaAntidoping = inventarioStore.controlaAntidoping;
    toast?.open?.({
      message: activar ? 'El antidoping ahora descuenta del inventario' : 'El antidoping ya no descuenta del inventario',
      type: 'success',
    });
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudo guardar el cambio.'), type: 'error' });
  } finally {
    guardandoAntidoping.value = false;
  }
}

// ---- Incapacidades por empresa (docs/modulos-y-funciones-especificacion.md, 4)
const empresasIncapacidades = ref<EmpresaIncapacidades[]>([]);
const panelEmpresas = ref(false);
const busquedaEmpresa = ref('');
const guardandoEmpresa = ref<string | null>(null);

const empresasActivas = computed(() => empresasIncapacidades.value.filter((e) => e.incapacidadesHabilitado).length);

const filasEmpresas = computed(() => {
  const consulta = normalizar(busquedaEmpresa.value.trim());
  return empresasIncapacidades.value.filter((empresa) => !consulta || normalizar(empresa.nombreEmpresa).includes(consulta));
});

async function cargarEmpresasIncapacidades() {
  if (!puedeConfigurar.value) return;
  try {
    const { data } = await ModulosFuncionesAPI.getEmpresasIncapacidades();
    empresasIncapacidades.value = data;
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudieron cargar las empresas.'), type: 'error' });
  }
}

async function cambiarEmpresa(idEmpresa: string, incapacidadesHabilitado: boolean) {
  if (guardandoEmpresa.value || !puedeConfigurar.value) return;
  guardandoEmpresa.value = idEmpresa;
  try {
    const { data } = await ModulosFuncionesAPI.updateEmpresasIncapacidades([{ idEmpresa, incapacidadesHabilitado }]);
    empresasIncapacidades.value = data;
    // El resto de la app (empresa, trabajadores, expediente, tablero) consulta esta lista
    await incapacidadesStore.cargarConfiguracion(true);
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudo guardar la empresa.'), type: 'error' });
  } finally {
    guardandoEmpresa.value = null;
  }
}

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await ModulosFuncionesAPI.getEstado();
    estado.value = data;
    if (data.inventarioHabilitado) await cargarCentrosInventario();
    if (data.incapacidadesHabilitado) await cargarEmpresasIncapacidades();
  } catch (error) {
    errorCarga.value = extractApiErrorMessage(error, 'No se pudieron cargar los módulos y funciones.');
  } finally {
    cargando.value = false;
  }
}

/** Guarda un interruptor; si falla, regresa al valor anterior y lo avisa. */
async function cambiar(cual: Interruptor) {
  if (!estado.value || guardando.value || !puedeConfigurar.value) return;
  guardando.value = cual;
  try {
    if (cual === 'firma') {
      const activar = !estado.value.firmaEnPantallaHabilitada;
      const { data } = await FormatosFirmadosAPI.actualizarConfiguracion({ firmaEnPantallaHabilitada: activar });
      estado.value.firmaEnPantallaHabilitada = data.firmaEnPantallaHabilitada;
      toast?.open?.({ message: activar ? 'Firma en pantalla activada' : 'Firma en pantalla desactivada', type: 'success' });
    } else if (cual === 'semaforizacion') {
      const activar = !estado.value.semaforizacionActivada;
      const { data } = await ModulosFuncionesAPI.actualizarSemaforizacion(activar);
      estado.value.semaforizacionActivada = data.semaforizacionActivada;
      // Para que el perfil y el resto de la sesión vean el valor nuevo sin recargar
      if (proveedorSaludStore.proveedorSalud) {
        (proveedorSaludStore.proveedorSalud as any).semaforizacionActivada = data.semaforizacionActivada;
      }
      toast?.open?.({
        message: activar ? 'Semaforización de resultados activada' : 'Semaforización de resultados desactivada',
        type: 'success',
      });
    } else if (cual === 'incapacidades') {
      const activar = !estado.value.incapacidadesHabilitado;
      const { data } = await ModulosFuncionesAPI.actualizarIncapacidades(activar);
      incapacidadesStore.aplicar(data);
      estado.value.incapacidadesHabilitado = data.incapacidadesHabilitado;
      toast?.open?.({ message: activar ? 'Incapacidades activadas' : 'Incapacidades desactivadas', type: 'success' });
      if (activar) {
        await cargarEmpresasIncapacidades();
        // Encendido sin empresas no aparece en ningún lado: se abre la lista para elegirlas
        if (empresasActivas.value === 0) panelEmpresas.value = true;
      }
    } else {
      const activar = !estado.value.inventarioHabilitado;
      await inventarioStore.guardarConfiguracion({ inventarioHabilitado: activar });
      estado.value.inventarioHabilitado = inventarioStore.habilitado;
      toast?.open?.({ message: activar ? 'Inventario clínico activado' : 'Inventario clínico desactivado', type: 'success' });
      if (activar) {
        await cargarCentrosInventario();
        // Encendido sin centros no aparece en ningún lado: se abre la lista para elegirlos
        if (centrosActivos.value === 0) panelCentros.value = true;
      }
    }
  } catch (error) {
    toast?.open?.({ message: extractApiErrorMessage(error, 'No se pudo guardar el cambio.'), type: 'error' });
  } finally {
    guardando.value = null;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="modulos-funciones max-w-3xl mx-auto px-4 sm:px-6 py-6">
    <h1 class="text-2xl font-semibold text-gray-900">Módulos y funciones</h1>
    <p class="text-sm text-gray-600 mt-1">
      Lo que tu organización usa en Ramazzini.
      <template v-if="puedeConfigurar">Los cambios se guardan al instante.</template>
      <template v-else>Solo el usuario Principal los cambia.</template>
    </p>

    <div v-if="cargando" class="py-16 text-center text-gray-500">Cargando…</div>

    <div v-else-if="errorCarga" class="py-12 text-center">
      <p class="text-red-700 mb-3">{{ errorCarga }}</p>
      <button type="button" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" @click="cargar">
        Reintentar
      </button>
    </div>

    <template v-else-if="estado">
      <h2 class="modulos-funciones__seccion text-sm font-semibold text-gray-600 mt-7 mb-3">
        Funciones · se aplican en toda la organización
      </h2>
      <div class="flex flex-col gap-3">
        <article class="modulos-funciones__tarjeta" data-interruptor="firma">
          <div class="modulos-funciones__icono"><i class="fa-solid fa-signature" aria-hidden="true"></i></div>
          <div class="min-w-0">
            <h3 class="modulos-funciones__titulo">Firma en pantalla</h3>
            <p class="modulos-funciones__texto">
              El trabajador firma los formatos en tableta, celular o mouse; firmar en papel sigue disponible.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            class="modulos-funciones__switch"
            :class="{ 'modulos-funciones__switch--on': estado.firmaEnPantallaHabilitada }"
            :aria-checked="estado.firmaEnPantallaHabilitada"
            aria-label="Firma en pantalla"
            :disabled="!puedeConfigurar || guardando !== null"
            @click="cambiar('firma')"
          ></button>
        </article>

        <article class="modulos-funciones__tarjeta" data-interruptor="semaforizacion">
          <div class="modulos-funciones__icono"><i class="fa-solid fa-traffic-light" aria-hidden="true"></i></div>
          <div class="min-w-0">
            <h3 class="modulos-funciones__titulo">Semaforización de resultados</h3>
            <p class="modulos-funciones__texto">
              Colores de aptitud en los informes:
              <span class="text-emerald-700">apto</span>, <span class="text-amber-700">con restricciones</span>,
              <span class="text-red-700">no apto</span>.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            class="modulos-funciones__switch"
            :class="{ 'modulos-funciones__switch--on': estado.semaforizacionActivada }"
            :aria-checked="estado.semaforizacionActivada"
            aria-label="Semaforización de resultados"
            :disabled="!puedeConfigurar || guardando !== null"
            @click="cambiar('semaforizacion')"
          ></button>
        </article>
      </div>

      <h2 class="modulos-funciones__seccion text-sm font-semibold text-gray-600 mt-8 mb-3">
        Módulos · se activan y luego eliges dónde se usan
      </h2>
      <div class="flex flex-col gap-3">
        <article class="modulos-funciones__tarjeta" data-interruptor="inventario">
          <div class="modulos-funciones__icono"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i></div>
          <div class="min-w-0">
            <h3 class="modulos-funciones__titulo">Inventario clínico</h3>
            <p class="modulos-funciones__texto">
              Existencias, lotes y caducidades; descuenta lo que se suministra en la nota médica.
            </p>
            <p v-if="estado.inventarioHabilitado" class="modulos-funciones__enlaces">
              <span
                v-if="puedeConfigurar"
                class="modulos-funciones__chip"
                :class="centrosActivos ? 'modulos-funciones__chip--ok' : 'modulos-funciones__chip--pendiente'"
              >
                {{
                  centrosActivos
                    ? `En ${centrosActivos} de ${centrosTotales} ${centrosTotales === 1 ? 'centro' : 'centros'} de trabajo`
                    : 'Elige los centros de trabajo'
                }}
              </span>
              <button v-if="puedeConfigurar" type="button" class="modulos-funciones__enlace" @click="panelCentros = !panelCentros">
                {{ panelCentros ? 'Ocultar centros' : 'Elegir centros' }}
              </button>
              <RouterLink :to="{ name: 'inventario-catalogo' }">Catálogo de insumos</RouterLink>
            </p>

          </div>
          <button
            type="button"
            role="switch"
            class="modulos-funciones__switch"
            :class="{ 'modulos-funciones__switch--on': estado.inventarioHabilitado }"
            :aria-checked="estado.inventarioHabilitado"
            aria-label="Inventario clínico"
            :disabled="!puedeConfigurar || guardando !== null"
            @click="cambiar('inventario')"
          ></button>
          <!-- A todo el ancho en celular; bajo el texto en pantallas grandes -->
          <div v-if="estado.inventarioHabilitado && panelCentros && puedeConfigurar" class="modulos-funciones__panel">
            <div class="modulos-funciones__panel-cabecera">
              <span class="font-semibold text-sm">Centros que llevan inventario</span>
              <input
                v-model="busquedaCentro"
                type="search"
                class="modulos-funciones__buscar"
                placeholder="Buscar empresa o centro"
                aria-label="Buscar empresa o centro de trabajo"
              />
            </div>
            <ul class="modulos-funciones__lista">
              <li v-for="centro in filasCentros" :key="centro.idCentroTrabajo" class="modulos-funciones__fila">
                <label class="modulos-funciones__fila-etiqueta">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-emerald-600"
                    :checked="centro.inventarioHabilitado"
                    :disabled="guardandoCentro !== null"
                    :data-centro="centro.idCentroTrabajo"
                    @change="cambiarCentro(centro.idCentroTrabajo, !centro.inventarioHabilitado)"
                  />
                  <span class="min-w-0">{{ centro.nombreEmpresa }} · {{ centro.nombreCentro }}</span>
                </label>
                <span class="modulos-funciones__fila-dato">
                  {{ centro.numeroTrabajadores }} {{ centro.numeroTrabajadores === 1 ? 'trabajador' : 'trabajadores' }}
                </span>
              </li>
              <li v-if="!filasCentros.length" class="modulos-funciones__fila modulos-funciones__fila-dato">
                {{ busquedaCentro ? 'Ningún centro coincide con la búsqueda.' : 'Todavía no hay centros de trabajo.' }}
              </li>
            </ul>
            <label class="modulos-funciones__antidoping">
              <input
                type="checkbox"
                class="h-4 w-4 accent-emerald-600"
                :checked="estado.inventarioControlaAntidoping"
                :disabled="guardandoAntidoping"
                @change="cambiarAntidoping"
              />
              <span>En esos centros, cada antidoping descuenta una prueba (al activarlo se agregan las pruebas al catálogo)</span>
            </label>
          </div>
        </article>
        <article v-if="estado.incapacidadesDisponible" class="modulos-funciones__tarjeta" data-interruptor="incapacidades">
          <div class="modulos-funciones__icono"><i class="fa-solid fa-bed" aria-hidden="true"></i></div>
          <div class="min-w-0">
            <h3 class="modulos-funciones__titulo">Incapacidades y riesgos de trabajo</h3>
            <p class="modulos-funciones__texto">
              Certificados del IMSS y descansos de la empresa, focos rojos, informe y prima de riesgo.
            </p>
            <p v-if="estado.incapacidadesHabilitado && puedeConfigurar" class="modulos-funciones__enlaces">
              <span
                class="modulos-funciones__chip"
                :class="empresasActivas ? 'modulos-funciones__chip--ok' : 'modulos-funciones__chip--pendiente'"
              >
                {{
                  empresasActivas
                    ? `En ${empresasActivas} de ${empresasIncapacidades.length} ${empresasIncapacidades.length === 1 ? 'empresa' : 'empresas'}`
                    : 'Elige las empresas'
                }}
              </span>
              <button type="button" class="modulos-funciones__enlace" @click="panelEmpresas = !panelEmpresas">
                {{ panelEmpresas ? 'Ocultar empresas' : 'Elegir empresas' }}
              </button>
            </p>
          </div>
          <button
            type="button"
            role="switch"
            class="modulos-funciones__switch"
            :class="{ 'modulos-funciones__switch--on': estado.incapacidadesHabilitado }"
            :aria-checked="estado.incapacidadesHabilitado"
            aria-label="Incapacidades y riesgos de trabajo"
            :disabled="!puedeConfigurar || guardando !== null"
            @click="cambiar('incapacidades')"
          ></button>
          <div v-if="estado.incapacidadesHabilitado && panelEmpresas && puedeConfigurar" class="modulos-funciones__panel">
            <div class="modulos-funciones__panel-cabecera">
              <span class="font-semibold text-sm">Empresas donde se gestionan</span>
              <input
                v-model="busquedaEmpresa"
                type="search"
                class="modulos-funciones__buscar"
                placeholder="Buscar empresa"
                aria-label="Buscar empresa"
              />
            </div>
            <ul class="modulos-funciones__lista">
              <li v-for="empresa in filasEmpresas" :key="empresa.idEmpresa" class="modulos-funciones__fila">
                <label class="modulos-funciones__fila-etiqueta">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-emerald-600"
                    :checked="empresa.incapacidadesHabilitado"
                    :disabled="guardandoEmpresa !== null"
                    :data-empresa="empresa.idEmpresa"
                    @change="cambiarEmpresa(empresa.idEmpresa, !empresa.incapacidadesHabilitado)"
                  />
                  <span class="min-w-0">{{ empresa.nombreEmpresa }}</span>
                </label>
                <span class="modulos-funciones__fila-dato">
                  {{ empresa.numeroTrabajadores }} {{ empresa.numeroTrabajadores === 1 ? 'trabajador' : 'trabajadores' }}
                </span>
              </li>
              <li v-if="!filasEmpresas.length" class="modulos-funciones__fila modulos-funciones__fila-dato">
                {{ busquedaEmpresa ? 'Ninguna empresa coincide con la búsqueda.' : 'Todavía no hay empresas.' }}
              </li>
            </ul>
            <p class="modulos-funciones__nota">
              Lo ve quien tiene el permiso de riesgos de trabajo. Quitar una empresa oculta sus incapacidades, no las borra.
            </p>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.modulos-funciones__tarjeta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.875rem;
  align-items: start;
  padding: 1rem 1.125rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background-color: #ffffff;
}

.modulos-funciones__icono {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  color: #4b5563;
  font-size: 1.1rem;
}

.modulos-funciones__titulo {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.modulos-funciones__texto {
  margin-top: 0.125rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
}

.modulos-funciones__enlaces {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  font-size: 0.875rem;
}

.modulos-funciones__enlaces :deep(a) {
  color: #047857;
  font-weight: 500;
}

.modulos-funciones__enlaces :deep(a:hover) {
  text-decoration: underline;
}

.modulos-funciones__switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  margin-top: 0.25rem;
  border-radius: 9999px;
  background-color: #d1d5db;
  transition: background-color 150ms;
  flex-shrink: 0;
}

.modulos-funciones__switch::after {
  content: '';
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  background-color: #ffffff;
  transition: transform 150ms;
}

.modulos-funciones__switch--on {
  background-color: #10b981;
}

.modulos-funciones__switch--on::after {
  transform: translateX(1.25rem);
}

.modulos-funciones__chip {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.5rem;
}

.modulos-funciones__chip--ok {
  background-color: #d1fae5;
  color: #065f46;
}

.modulos-funciones__chip--pendiente {
  background-color: #fef3c7;
  color: #92400e;
}

.modulos-funciones__enlace {
  color: #047857;
  font-weight: 500;
}

.modulos-funciones__enlace:hover {
  text-decoration: underline;
}

.modulos-funciones__panel {
  grid-column: 1 / -1;
  margin-top: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #f9fafb;
  border: 1px solid #f3f4f6;
}

.modulos-funciones__panel-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  color: #111827;
}

.modulos-funciones__buscar {
  width: 13rem;
  max-width: 100%;
  height: 2rem;
  padding: 0 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: #ffffff;
}

.modulos-funciones__lista {
  max-height: 18rem;
  overflow-y: auto;
}

.modulos-funciones__fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #1f2937;
}

.modulos-funciones__fila-etiqueta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  cursor: pointer;
}

.modulos-funciones__fila-dato {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: #6b7280;
}

.modulos-funciones__nota {
  margin-top: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.8125rem;
  color: #6b7280;
}

.modulos-funciones__antidoping {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #1f2937;
  cursor: pointer;
}

@media (min-width: 640px) {
  .modulos-funciones__panel {
    grid-column: 2 / -1;
  }
}

@media (max-width: 639px) {
  .modulos-funciones__fila {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }

  .modulos-funciones__fila-dato {
    padding-left: 1.5rem;
  }
}

.modulos-funciones__switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
