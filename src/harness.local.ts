// Banco de pruebas visual TEMPORAL del tablero de salud, con datos de ejemplo y sin servidor. No se sube al repositorio.
import './assets/main.css';
import './assets/dark-mode.css';
import './assets/modal-dirty-guard.css';
import './assets/modal-transitions.css';
import 'vue-toast-notification/dist/theme-bootstrap.css';
import axios from 'axios';
import { applyAppTheme } from '@/theme/appTheme';

const q = new URLSearchParams(location.search);
applyAppTheme(q.get('dark') === '1');
if (q.get('quieto') === '1') document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '*,*::before,*::after{transition:none!important;animation:none!important}' }));

const EMPRESA = '65f0000000000000000000e1';
const CENTRO = '65f0000000000000000000c1';
const veces = (n: number, o: object) => Array.from({ length: n }, () => ({ ...o }));
const nordico = (semaforo: string, r12: string[] = [], r7: string[] = [], puesto = 'Soldador de estructuras') => ({
  semaforo, regionesMolestia12Meses: r12, regionesMolestia7Dias: r7, regionesImpedimento: r7.slice(0, 1), regionesRelacionLaboral: r12.slice(0, 1), regionesPrioritarias: r7, intensidadMaxima: 5, puesto,
});
const dashboard = Object.fromEntries(Object.entries({
  grupoEtario: [...veces(14, { sexo: 'Masculino', fechaNacimiento: '1988-04-02' }), ...veces(9, { sexo: 'Masculino', fechaNacimiento: '1975-04-02' }), ...veces(6, { sexo: 'Femenino', fechaNacimiento: '1997-04-02' }), ...veces(5, { sexo: 'Femenino', fechaNacimiento: '1968-04-02' })],
  imc: [...veces(10, { categoriaIMC: 'Normal' }), ...veces(12, { categoriaIMC: 'Sobrepeso' }), ...veces(6, { categoriaIMC: 'Obesidad clase I' }), ...veces(2, { categoriaIMC: 'Obesidad clase II' })],
  tensionArterial: [...veces(18, { categoriaTensionArterial: 'Normal' }), ...veces(6, { categoriaTensionArterial: 'Alta' }), ...veces(4, { categoriaTensionArterial: 'Hipertensión grado 1' }), ...veces(2, { categoriaTensionArterial: 'Óptima' })],
  circunferenciaCintura: [...veces(9, { categoriaCircunferenciaCintura: 'Alto Riesgo' }), ...veces(6, { categoriaCircunferenciaCintura: 'Riesgo Aumentado' }), ...veces(15, { categoriaCircunferenciaCintura: 'Bajo Riesgo' })],
  enfermedadesCronicas: [...veces(3, { diabeticosPP: 'Si', hipertensivosPP: 'Si' }), ...veces(4, { hipertensivosPP: 'Si' }), ...veces(2, { alergicos: 'Si' }), ...veces(21, {})],
  antecedentes: [...veces(5, { lumbalgias: 'Si' }), ...veces(3, { accidentes: 'Si' }), ...veces(6, { quirurgicos: 'Si' }), ...veces(16, {})],
  agentesRiesgo: [...veces(14, { agentesRiesgoActuales: ['Ruido'] }), ...veces(8, { agentesRiesgoActuales: ['Ruido', 'Polvos', 'Ergonómicos'] }), ...veces(6, { agentesRiesgoActuales: ['Ergonómicos', 'Químicos'] }), ...veces(6, { agentesRiesgoActuales: [] })],
  aptitudes: [...veces(22, { aptitudPuesto: 'Apto Sin Restricciones' }), ...veces(5, { aptitudPuesto: 'Apto Con Restricciones' }), ...veces(2, { aptitudPuesto: 'Apto Con Precaución' }), { aptitudPuesto: 'No Apto' }],
  consultas: [...veces(7, { fechaNotaMedica: '2026-02-10T00:00:00.000Z', tipoNota: 'Inicial', trabajador: 'a-1' }), ...veces(4, { fechaNotaMedica: '2026-03-05T00:00:00.000Z', tipoNota: 'Seguimiento', trabajador: 'a-2' }), ...veces(9, { fechaNotaMedica: '2026-06-05T00:00:00.000Z', tipoNota: 'Inicial', trabajador: 'a-3' }), { fechaNotaMedica: '2026-07-05T00:00:00.000Z', tipoNota: 'Alta', trabajador: 'a-4' }],
  diagnosticos: [...veces(6, { clave: 'J00X', etiqueta: 'J00X - RINOFARINGITIS AGUDA [RESFRIADO COMUN]', principal: true, mes: '2026-02' }), ...veces(4, { clave: 'M545', etiqueta: 'M545 - LUMBAGO NO ESPECIFICADO', principal: true, mes: '2026-03' }), ...veces(2, { clave: 'I10X', etiqueta: 'I10X - HIPERTENSION ESENCIAL (PRIMARIA)', principal: true, mes: '2026-06' })],
  puestos: ['Soldador de estructuras', 'Operador de montacargas'],
  agudezaVisual: [...veces(20, { agudezaVisual: 'Normal', requiereLentesUsoGeneral: 'No', sinCorreccionLejanaInterpretacion: 'Visión excepcional' }), ...veces(8, { requiereLentesUsoGeneral: 'Si', sinCorreccionLejanaInterpretacion: 'Visión ligeramente reducida' })],
  daltonismo: [...veces(26, { interpretacionIshihara: 'Normal' }), ...veces(2, { interpretacionIshihara: 'Daltonismo' })],
  cuestionarioNordico: [...veces(11, nordico('verde')), ...veces(7, nordico('amarillo', ['espaldaBaja', 'hombroDerecho'])), ...veces(4, nordico('rojo', ['espaldaBaja', 'cuello', 'munecaDerecha'], ['espaldaBaja'], 'Operador de montacargas')), ...veces(3, nordico('amarillo', ['rodillaIzquierda'], [], 'Operador de montacargas'))],
  suenoVigilia: [...veces(9, { prioridad: 'verde', areas: { calidadDescanso: 'verde', somnolencia: 'verde', fatiga: 'verde' }, alertas: [], horarioLaboral: 'Diurno', minutosSuenoDiarios: 450 }), ...veces(6, { prioridad: 'amarillo', areas: { calidadDescanso: 'amarillo', somnolencia: 'verde', fatiga: 'amarillo' }, alertas: ['ronquidoFuerte'], horarioLaboral: 'Diurno', minutosSuenoDiarios: 400 }), ...veces(4, { prioridad: 'rojo', areas: { calidadDescanso: 'naranja', somnolencia: 'rojo', fatiga: 'naranja' }, alertas: ['suenoActividadPeligrosa', 'suenoCorto'], horarioLaboral: 'Nocturno', minutosSuenoDiarios: 300 })],
  antidoping: [...veces(18, { mes: '2026-03', trabajador: 'x', evaluadas: ['marihuana', 'cocaina', 'anfetaminas'], positivos: [] }).map((p, i) => ({ ...p, trabajador: 'd-' + i })), { mes: '2026-06', trabajador: 'd-1', evaluadas: ['marihuana', 'cocaina'], positivos: ['marihuana'] }, { mes: '2025-09', trabajador: 'd-3', evaluadas: ['marihuana'], positivos: [] }, { mes: '2025-06', trabajador: 'd-4', evaluadas: ['marihuana'], positivos: [] }, { mes: '2024-10', trabajador: 'd-5', evaluadas: ['marihuana'], positivos: [] }, { mes: '2026-06', trabajador: 'd-2', evaluadas: ['marihuana', 'cocaina', 'anfetaminas'], positivos: ['marihuana', 'anfetaminas'] }],
  habitos: [...veces(9, { tabaquismo: 'Si', alcoholismo: 'Si', toxicomanias: 'No', actividadFisicaDeficiente: 'Si', alimentacionDeficiente: 'No' }), ...veces(21, { tabaquismo: 'No', alcoholismo: 'No', toxicomanias: 'No', actividadFisicaDeficiente: 'Si', alimentacionDeficiente: 'Si' })],
  cardiometabolico: [...veces(4, { diagnosticos: ['HIPERTENSION_ARTERIAL'], control: { HIPERTENSION_ARTERIAL: 'CONTROLADA' }, gradoObesidad: '', laboratorio: { glucosa: 'Normal', ldl: 'Alto' } }), ...veces(3, { diagnosticos: ['HIPERTENSION_ARTERIAL', 'DIABETES_MELLITUS_TIPO_2'], control: { HIPERTENSION_ARTERIAL: 'NO_CONTROLADA', DIABETES_MELLITUS_TIPO_2: 'NO_CONTROLADA' }, gradoObesidad: '', laboratorio: { glucosa: 'Elevada', hba1c: 'Compatible con diabetes', ldl: 'Óptimo' } }), ...veces(3, { diagnosticos: ['OBESIDAD'], control: {}, gradoObesidad: 'OBESIDAD_I', laboratorio: {} }), ...veces(2, { diagnosticos: ['OBESIDAD'], control: {}, gradoObesidad: 'OBESIDAD_II', laboratorio: {} }), { diagnosticos: ['OBESIDAD'], control: {}, gradoObesidad: 'SOBREPESO', laboratorio: {} }],
  otologica: [...veces(8, { zumbidoTinnitus: 'SI', perdidaAudicion: 'NO', trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: 'A VECES', musicaFuerteAudifonos: 'NO' }), ...veces(12, { zumbidoTinnitus: 'NO', perdidaAudicion: 'NO', trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: 'SIEMPRE', musicaFuerteAudifonos: 'SI' })],
  aptitudVigencia: [...veces(20, { fechaAptitudPuesto: new Date(Date.now() - 60 * 864e5).toISOString() }), ...veces(6, { fechaAptitudPuesto: new Date(Date.now() - 330 * 864e5).toISOString() }), ...veces(4, { fechaAptitudPuesto: new Date(Date.now() - 500 * 864e5).toISOString() }), ...veces(4, { fechaAptitudPuesto: null })],
  audiometria: [], espirometria: [...veces(14, { resultadoGlobal: 'NORMAL' }), ...veces(5, { resultadoGlobal: 'ANORMAL', tipoAlteracionEspirometria: 'Obstructivo', tipoAlteracionEKG: 'Arritmia', tipoAlteracionRayosX: 'Otro', tipoAlteracionAnalisisLaboratorio: 'Otro' }), { resultadoGlobal: 'NO_CONCLUYENTE' }], ekg: [...veces(14, { resultadoGlobal: 'NORMAL' }), ...veces(5, { resultadoGlobal: 'ANORMAL', tipoAlteracionEspirometria: 'Obstructivo', tipoAlteracionEKG: 'Arritmia', tipoAlteracionRayosX: 'Otro', tipoAlteracionAnalisisLaboratorio: 'Otro' }), { resultadoGlobal: 'NO_CONCLUYENTE' }], rayosX: [...veces(14, { resultadoGlobal: 'NORMAL' }), ...veces(5, { resultadoGlobal: 'ANORMAL', tipoAlteracionEspirometria: 'Obstructivo', tipoAlteracionEKG: 'Arritmia', tipoAlteracionRayosX: 'Otro', tipoAlteracionAnalisisLaboratorio: 'Otro' }), { resultadoGlobal: 'NO_CONCLUYENTE' }], analisisLaboratorio: [...veces(14, { resultadoGlobal: 'NORMAL' }), ...veces(5, { resultadoGlobal: 'ANORMAL', tipoAlteracionEspirometria: 'Obstructivo', tipoAlteracionEKG: 'Arritmia', tipoAlteracionRayosX: 'Otro', tipoAlteracionAnalisisLaboratorio: 'Otro' }), { resultadoGlobal: 'NO_CONCLUYENTE' }],
}).map(([k, v]) => [k, k === 'puestos' ? v : [v]]));
(dashboard as any).historial = { saludVisual: true, gabinete: true, saludMental: false, diagnosticos: true, musculoesqueletico: true, sueno: true, antidoping: true, cardiometabolico: true, otologica: true };

const centrosDeEmpresa = [{ _id: CENTRO, nombreCentro: 'Planta Norte Monterrey', idEmpresa: EMPRESA }];
const respuestas: [RegExp, unknown][] = [
  [/\/dashboard/, dashboard],
  [/inventario\/configuracion/, { inventarioHabilitado: false }],
  [/informe-personalizacion/, null],
  [/centros-trabajo\/?$/, centrosDeEmpresa],
  [/(empresas|api)\/?[0-9a-f]{24}$|empresas/, { _id: EMPRESA, nombreComercial: 'Aceros y Laminados del Norte', razonSocial: 'Aceros y Laminados del Norte, S.A. de C.V.' }],
];
axios.defaults.adapter = async (config) => {
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  const encontrada = respuestas.find(([patron]) => patron.test(url));
  return { data: encontrada ? encontrada[1] : [], status: 200, statusText: 'OK', headers: {}, config } as any;
};

(async () => {
  const { createApp, h } = await import('vue');
  const { createPinia } = await import('pinia');
  const { createRouter, createMemoryHistory } = await import('vue-router');
  const { plugin, defaultConfig } = await import('@formkit/vue');
  const config = (await import('../formkit.config')).default;
  const { initToast } = await import('@/utils/toast');
  const Componente = (await import('@/views/DashboardView.vue')).default;
  const Raiz = { render: () => h('main', { class: 'p-3 sm:p-6' }, [h(Componente)]) };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/t/:idEmpresa/:idCentroTrabajo', name: 'trabajadores', component: { render: () => h('p', { id: 'destino' }, 'VISTA TRABAJADORES ' + JSON.stringify(router.currentRoute.value.query)) } }, { path: '/:idEmpresa', component: Raiz }, { path: '/:resto(.*)*', name: 'otra', component: { render: () => h('p', 'otra ruta') } }],
  });
  const resolver = router.resolve.bind(router);
  router.resolve = ((destino: any, ...resto: any[]) => { try { return resolver(destino, ...resto); } catch { return resolver({ name: 'otra' }); } }) as any;
  router.push({ path: `/${EMPRESA}`, query: q.get('informes') ? { informes: '1' } : {} });
  await router.isReady();
  const { RouterView } = await import('vue-router');
  const app = createApp({ render: () => h(RouterView) });
  app.provide('toast', initToast());
  app.use(createPinia()).use(plugin, defaultConfig(config)).use(router);
  const { useUserStore } = await import('@/stores/user');
  (useUserStore() as any).user = { _id: 'u1', role: 'Principal', username: 'dra.martinez', idProveedorSalud: 'p1', permissions: {} };
  app.mount('#app');
  setTimeout(() => ((window as any).__listo = true), 2500);
})();
