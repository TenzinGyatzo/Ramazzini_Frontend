<script setup>
import { onMounted, inject } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import {
  DIAGNOSTICO_CARDIOMETABOLICO_OPTS,
  CODIGO_DIAGNOSTICO_OBESIDAD,
  aplicarObesidadDesdeCategoriaIMC,
  sincronizarDiagnosticoObesidadPorImc,
  ajustarSomatometriaHaciaImcObjetivo,
  imcRedondeadoDesdePesoAltura,
  categoriaImcEspaniolDesdeNumero,
} from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import { obtenerSomatometriaUltimaExploracionFisica } from '@/helpers/cardiometabolico/alturaDesdeExploracionFisica';

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const toast = inject('toast');

/** Mantiene control por condición y grado IMC de obesidad; descarta claves desconocidas. */
function normalizarEstadoCondicionesDesdeFuente(ec) {
  if (!ec || typeof ec !== 'object') return undefined;
  const out = {};
  for (const k of ['hipertensionArterial', 'diabetesMellitusTipo2', 'dislipidemia']) {
    const c = ec[k]?.control;
    if (c) out[k] = { control: c };
  }
  const ob = ec.obesidad;
  if (ob?.grado) {
    out.obesidad = { grado: ob.grado };
  }
  if (Object.keys(out).length === 0) return undefined;
  return out;
}

function hidratar() {
  const src = documentos.currentDocument || {};
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.diagnosticosActivos) fd.diagnosticosActivos = [];
  if (Array.isArray(src.diagnosticosActivos)) {
    fd.diagnosticosActivos = [...src.diagnosticosActivos];
  }
  const fromSrc = normalizarEstadoCondicionesDesdeFuente(src.estadoCondiciones);
  const fromFd = normalizarEstadoCondicionesDesdeFuente(fd.estadoCondiciones);
  if (fromSrc !== undefined) fd.estadoCondiciones = fromSrc;
  else if (fromFd !== undefined) fd.estadoCondiciones = fromFd;
  else delete fd.estadoCondiciones;
}

onMounted(() => {
  hidratar();
  const fd = formDataEventoSeguimientoCardiometabolico;
  const cat = fd.somatometria?.categoriaIMC;
  if (typeof cat === 'string' && cat.trim() !== '') {
    aplicarObesidadDesdeCategoriaIMC(fd, cat);
  }
  sincronizarDiagnosticoObesidadPorImc(fd, fd.somatometria?.indiceMasaCorporal);
});

function tieneDiagnostico(value) {
  const arr = formDataEventoSeguimientoCardiometabolico.diagnosticosActivos;
  return Array.isArray(arr) && arr.includes(value);
}

function asegurarSomatometriaMinimaParaImc() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.somatometria) fd.somatometria = {};
  const s = fd.somatometria;
  const esHombre = trabajadores.currentTrabajador?.sexo === 'Masculino';
  const ef = obtenerSomatometriaUltimaExploracionFisica(
    documentos.documentsByYear,
    trabajadores.currentTrabajador?._id,
  );
  if (!(typeof s.altura === 'number') || s.altura <= 0) {
    s.altura = ef?.altura != null ? ef.altura : esHombre ? 1.7 : 1.6;
  }
  if (!(typeof s.peso === 'number') || s.peso <= 0) {
    s.peso = ef?.peso != null ? ef.peso : esHombre ? 80 : 70;
  }
}

function toggleDiagnostico(value) {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.diagnosticosActivos) fd.diagnosticosActivos = [];

  if (value === CODIGO_DIAGNOSTICO_OBESIDAD) {
    asegurarSomatometriaMinimaParaImc();
    const sSom = fd.somatometria;
    const imcRecalc = imcRedondeadoDesdePesoAltura(sSom?.peso ?? NaN, sSom?.altura ?? NaN);
    if (Number.isFinite(imcRecalc)) {
      sSom.indiceMasaCorporal = imcRecalc;
      sSom.categoriaIMC = categoriaImcEspaniolDesdeNumero(imcRecalc);
    }

    const alt = fd.somatometria?.altura;
    if (!(typeof alt === 'number') || alt <= 0) {
      toast?.open({
        message:
          'No se pudo determinar la talla para calcular el peso. Complete somatometría o revise los datos.',
        type: 'error',
      });
      return;
    }

    const i = fd.diagnosticosActivos.indexOf(value);
    if (i >= 0) {
      ajustarSomatometriaHaciaImcObjetivo(fd, 'desmarcar_obesidad_diagnostico');
    } else {
      const imc = fd.somatometria?.indiceMasaCorporal;
      if (typeof imc === 'number' && imc >= 30) {
        aplicarObesidadDesdeCategoriaIMC(fd, fd.somatometria?.categoriaIMC ?? '');
        sincronizarDiagnosticoObesidadPorImc(fd, imc);
      } else {
        ajustarSomatometriaHaciaImcObjetivo(fd, 'marcar_obesidad_diagnostico');
      }
    }
    return;
  }

  const i = fd.diagnosticosActivos.indexOf(value);
  if (i >= 0) fd.diagnosticosActivos.splice(i, 1);
  else fd.diagnosticosActivos.push(value);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Diagnósticos activos</h1>

    <section
      class="mt-2"
      aria-labelledby="diag-activos-heading"
    >
      <div class="flex flex-col gap-2">
        <label
          v-for="opt in DIAGNOSTICO_CARDIOMETABOLICO_OPTS"
          :key="opt.value"
          class="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50/80 hover:border-emerald-200 transition-colors">
          <input
            type="checkbox"
            :checked="tieneDiagnostico(opt.value)"
            @change="toggleDiagnostico(opt.value)"
          />
          <span>{{ opt.label }}</span>
          <span
            v-if="opt.value === CODIGO_DIAGNOSTICO_OBESIDAD"
            class="text-xs text-gray-400 font-normal"
            >(IMC)</span
          >
        </label>
      </div>
    </section>
  </div>
</template>
