<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import DocumentosAPI from '@/api/DocumentosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { resumenSucintoEntrevistaPsicologica } from '@/helpers/conclusionEntrevistaPsicologica';
import {
  textoResumenTrastornosEstadoAnimo,
  textoResumenCuestionarioProdromalBreve,
  textoResumenTrastornoLimitePersonalidad,
} from '@/helpers/resumenesCuestionariosPsicologicosAptitud';

const trabajadores = useTrabajadoresStore();
const { formDataAptitud } = useFormDataStore();

const nearestOpts = { sameYearAsReference: true };

// Valor local para alteracionesSalud
const alteracionesSalud = ref('');

// Documentos más cercanos
const historiasClinicas = ref([]);
const nearestHistoriaClinica = ref(null);

const exploracionesFisicas = ref([]);
const nearestExploracionFisica = ref(null);

const examenesVista = ref([]);
const nearestExamenVista = ref(null);

const entrevistasPsicologicas = ref([]);
const nearestEntrevistaPsicologica = ref(null);

const trastornosEstadoAnimoList = ref([]);
const nearestTrastornosEstadoAnimo = ref(null);

const cuestionariosProdromalBreve = ref([]);
const nearestCuestionarioProdromalBreve = ref(null);

const trastornosLimitePersonalidad = ref([]);
const nearestTrastornoLimitePersonalidad = ref(null);

const recalcularDocumentosCercanos = () => {
  const f = formDataAptitud.fechaAptitudPuesto;
  nearestHistoriaClinica.value = findNearestDocument(
    historiasClinicas.value,
    f,
    'fechaHistoriaClinica',
    nearestOpts,
  );
  nearestExploracionFisica.value = findNearestDocument(
    exploracionesFisicas.value,
    f,
    'fechaExploracionFisica',
    nearestOpts,
  );
  nearestExamenVista.value = findNearestDocument(examenesVista.value, f, 'fechaExamenVista', nearestOpts);
  nearestEntrevistaPsicologica.value = findNearestDocument(
    entrevistasPsicologicas.value,
    f,
    'fechaEntrevistaPsicologica',
    nearestOpts,
  );
  nearestTrastornosEstadoAnimo.value = findNearestDocument(
    trastornosEstadoAnimoList.value,
    f,
    'fechaTrastornosEstadoAnimo',
    nearestOpts,
  );
  nearestCuestionarioProdromalBreve.value = findNearestDocument(
    cuestionariosProdromalBreve.value,
    f,
    'fechaCuestionarioProdromalBreve',
    nearestOpts,
  );
  nearestTrastornoLimitePersonalidad.value = findNearestDocument(
    trastornosLimitePersonalidad.value,
    f,
    'fechaTrastornoLimitePersonalidad',
    nearestOpts,
  );
};

// Generar el texto dinámico basado en la información
const textoBase = computed(() => {
  if (!nearestExploracionFisica.value || !nearestHistoriaClinica.value) {
    return 'Hace falta registrar la historia clínica y/o la exploración física para generar el texto base.';
  }

  const { sexo } = trabajadores.currentTrabajador;
  const {
    categoriaIMC,
    indiceMasaCorporal,
    circunferenciaCintura,
    categoriaCircunferenciaCintura,
    categoriaTensionArterial,
    tensionArterialSistolica,
    tensionArterialDiastolica,
  } = nearestExploracionFisica.value;

  const { sinCorreccionLejanaInterpretacion, porcentajeIshihara } = nearestExamenVista.value || {};

  let riesgoCintura = '';
  if (categoriaCircunferenciaCintura === 'Bajo Riesgo') {
    riesgoCintura = 'riesgo bajo de desarrollar enfermedades cardiometabólicas.';
  } else if (categoriaCircunferenciaCintura === 'Riesgo Aumentado') {
    riesgoCintura = 'riesgo aumentado de desarrollar enfermedades cardiometabólicas.';
  } else if (categoriaCircunferenciaCintura === 'Alto Riesgo') {
    riesgoCintura = 'riesgo alto de desarrollar enfermedades cardiometabólicas.';
  } else {
    riesgoCintura = 'riesgo no clasificado de desarrollar enfermedades cardiometabólicas.';
  }

  let tensionArterialTexto = '';
  const categoriasTensionArterialValidas = ['óptima', 'normal', 'alta'];
  if (categoriasTensionArterialValidas.includes(categoriaTensionArterial.toLowerCase())) {
    tensionArterialTexto = `presión arterial ${categoriaTensionArterial.toLowerCase()}`;
  } else {
    tensionArterialTexto = categoriaTensionArterial.toLowerCase();
  }
  tensionArterialTexto += ` con una medición de ${tensionArterialSistolica}/${tensionArterialDiastolica} mmHg.`;

  const categoriaIMCMap = {
    'Bajo peso': 'peso bajo',
    Normal: 'peso normal',
    Sobrepeso: 'sobrepeso',
    'Obesidad clase I': 'obesidad clase I',
    'Obesidad clase II': 'obesidad clase II',
    'Obesidad clase III': 'obesidad clase III',
  };

  let texto = `${sexo === 'Femenino' ? 'La trabajadora' : 'El trabajador'} presenta ${categoriaIMCMap[categoriaIMC] || categoriaIMC} con un índice de masa corporal (IMC) de ${indiceMasaCorporal}. Tiene una circunferencia de cintura de ${circunferenciaCintura} cm por lo que tiene ${riesgoCintura} Presenta ${tensionArterialTexto}`;

  if (nearestExamenVista.value && sinCorreccionLejanaInterpretacion) {
    const ish = porcentajeIshihara != null ? porcentajeIshihara : 100;
    texto += ` Tiene una ${sinCorreccionLejanaInterpretacion.toLowerCase()}${ish < 80 ? ' y padece daltonismo' : ' y tiene una visión cromática normal'}.`;
  }

  texto += ` ${nearestHistoriaClinica.value?.resumenHistoriaClinica || ''}. ${nearestExploracionFisica.value?.resumenExploracionFisica || ''}.`;

  const psico = [];
  if (nearestEntrevistaPsicologica.value) {
    psico.push(
      `Entrevista psicológica: ${resumenSucintoEntrevistaPsicologica(nearestEntrevistaPsicologica.value)}`,
    );
  }
  if (nearestTrastornosEstadoAnimo.value) {
    psico.push(`MDQ: ${textoResumenTrastornosEstadoAnimo(nearestTrastornosEstadoAnimo.value)}.`);
  }
  if (nearestCuestionarioProdromalBreve.value) {
    psico.push(`Cuestionario prodromal breve: ${textoResumenCuestionarioProdromalBreve(nearestCuestionarioProdromalBreve.value)}.`);
  }
  if (nearestTrastornoLimitePersonalidad.value) {
    psico.push(`MSI-BPD: ${textoResumenTrastornoLimitePersonalidad(nearestTrastornoLimitePersonalidad.value)}`);
  }
  if (psico.length > 0) {
    texto += ` ${psico.join(' ')}`;
  }

  return texto;
});

// Actualizar siempre alteracionesSalud al cambiar los documentos más cercanos
const actualizarAlteracionesSalud = () => {
  formDataAptitud.alteracionesSalud = textoBase.value;
  alteracionesSalud.value = textoBase.value;
};

onMounted(async () => {
  try {
    const { data: vecinos } = await DocumentosAPI.getAptitudInformeVecinos(
      trabajadores.currentTrabajadorId,
    );

    historiasClinicas.value = vecinos?.historiaClinica ?? [];
    exploracionesFisicas.value = vecinos?.exploracionFisica ?? [];
    examenesVista.value = vecinos?.examenVista ?? [];
    entrevistasPsicologicas.value = vecinos?.entrevistaPsicologica ?? [];
    trastornosEstadoAnimoList.value = vecinos?.trastornosEstadoAnimo ?? [];
    cuestionariosProdromalBreve.value = vecinos?.cuestionarioProdromalBreve ?? [];
    trastornosLimitePersonalidad.value = vecinos?.trastornoLimitePersonalidad ?? [];

    recalcularDocumentosCercanos();
    actualizarAlteracionesSalud();
  } catch (error) {
    console.error('Error al obtener los documentos:', error);
  }
});

watch(() => formDataAptitud.fechaAptitudPuesto, recalcularDocumentosCercanos);

watch(
  [
    nearestHistoriaClinica,
    nearestExploracionFisica,
    nearestExamenVista,
    nearestEntrevistaPsicologica,
    nearestTrastornosEstadoAnimo,
    nearestCuestionarioProdromalBreve,
    nearestTrastornoLimitePersonalidad,
  ],
  actualizarAlteracionesSalud,
);
</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
  <div class="mb-4">
    <h2 class="text-lg font-semibold mb-4 text-gray-800">Alteraciones de Salud</h2>
    <p class="text-sm font-medium mb-1 text-gray-800 leading-4">Descripción de alteraciones encontradas:</p>
    <div class="font-light mb-4">
      <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64"
        v-model="formDataAptitud.alteracionesSalud"
        :placeholder="textoBase || 'Cargando datos...'"
        required
      >
      </textarea>
    </div>
  </div>
</template>
