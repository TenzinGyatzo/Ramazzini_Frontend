<script setup lang="ts">
/**
 * «Módulos y funciones» (docs/modulos-y-funciones-especificacion.md): primero las funciones, que
 * se aplican en toda la organización, y después los módulos, que se activan y luego se elige dónde
 * se usan. Cada interruptor se guarda al instante por su propia ruta.
 */
import { computed, inject, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import FormatosFirmadosAPI from '@/api/FormatosFirmadosAPI';
import ModulosFuncionesAPI, { type EstadoModulosFunciones } from '@/api/ModulosFuncionesAPI';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { useInventarioStore } from '@/stores/inventario';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';

type Interruptor = 'firma' | 'semaforizacion' | 'inventario';

const toast: any = inject('toast');
const userStore = useUserStore();
const inventarioStore = useInventarioStore();
const proveedorSaludStore = useProveedorSaludStore();

const estado = ref<EstadoModulosFunciones | null>(null);
const cargando = ref(true);
const errorCarga = ref('');
const guardando = ref<Interruptor | null>(null);

const puedeConfigurar = computed(
  () => userStore.user?.role === 'Principal' || userStore.user?.role === 'Administrador',
);

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const { data } = await ModulosFuncionesAPI.getEstado();
    estado.value = data;
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
    } else {
      const activar = !estado.value.inventarioHabilitado;
      await inventarioStore.guardarConfiguracion({ inventarioHabilitado: activar });
      estado.value.inventarioHabilitado = inventarioStore.habilitado;
      toast?.open?.({ message: activar ? 'Inventario clínico activado' : 'Inventario clínico desactivado', type: 'success' });
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

.modulos-funciones__switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
