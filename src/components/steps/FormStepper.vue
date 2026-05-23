<script>
import axios from 'axios';
import { ref, onMounted, onUnmounted, inject, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import DocumentosAPI from '@/api/DocumentosAPI';

import Step1Antidoping from '../steps/antidopingSteps/Step1.vue';
import Step2Antidoping from '../steps/antidopingSteps/Step2.vue';
import Step1Aptitud from '../steps/aptitudSteps/Step1.vue';
import Step2Aptitud from '../steps/aptitudSteps/Step2.vue';
import Step3Aptitud from '../steps/aptitudSteps/Step3.vue';
import Step4Aptitud from '../steps/aptitudSteps/Step4.vue';
import Step5Aptitud from '../steps/aptitudSteps/Step5.vue';
import Step6Aptitud from '../steps/aptitudSteps/Step6.vue';
import Step7Aptitud from '../steps/aptitudSteps/Step7.vue';
import Step8Aptitud from '../steps/aptitudSteps/Step8.vue';
import Step9Aptitud from '../steps/aptitudSteps/Step9.vue';
import Step10Aptitud from '../steps/aptitudSteps/Step10.vue';
import Step11Aptitud from '../steps/aptitudSteps/Step11.vue';
import Step1Audiometria from '../steps/audiometriaSteps/Step1.vue';
import Step2Audiometria from '../steps/audiometriaSteps/Step2.vue';
import Step3Audiometria from '../steps/audiometriaSteps/Step3.vue';
import Step4Audiometria from '../steps/audiometriaSteps/Step4.vue';
import Step5Audiometria from '../steps/audiometriaSteps/Step5.vue';
import Step6Audiometria from '../steps/audiometriaSteps/Step6.vue';
import Step7Audiometria from '../steps/audiometriaSteps/Step7.vue';
import Step1Certificado from '../steps/certificadoSteps/Step1.vue';
import Step2Certificado from '../steps/certificadoSteps/Step2.vue';
import Step1CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step1.vue';
import Step2CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step2.vue';
import Step3CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step3.vue';
import Step4CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step4.vue';
import Step5CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step5.vue';
import Step6CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step6.vue';
import Step7CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step7.vue';
import Step8CertificadoExpedito from '../steps/certificadoExpeditoSteps/Step8.vue';
import StepAntecedentesGT from '../steps/examenVistaSteps/StepAntecedentesGT.vue';
import StepAnamnesisGT from '../steps/examenVistaSteps/StepAnamnesisGT.vue';
import StepUtilizaAnteojosGT from '../steps/examenVistaSteps/StepUtilizaAnteojosGT.vue';
import Step1ExamenVista from '../steps/examenVistaSteps/Step1.vue';
import Step2ExamenVista from '../steps/examenVistaSteps/Step2.vue';
import Step3ExamenVista from '../steps/examenVistaSteps/Step3.vue';
import Step4ExamenVista from '../steps/examenVistaSteps/Step4.vue';
import Step5ExamenVista from '../steps/examenVistaSteps/Step5.vue';
import Step6ExamenVista from '../steps/examenVistaSteps/Step6.vue';
import Step7ExamenVista from '../steps/examenVistaSteps/Step7.vue';
import Step8ExamenVista from '../steps/examenVistaSteps/Step8.vue';
import Step9ExamenVista from '../steps/examenVistaSteps/Step9.vue';
import Step1ExploracionFisica from '../steps/exploracionFisicaSteps/Step1.vue';
import Step2ExploracionFisica from '../steps/exploracionFisicaSteps/Step2.vue';
import Step3ExploracionFisica from '../steps/exploracionFisicaSteps/Step3.vue';
import Step4ExploracionFisica from '../steps/exploracionFisicaSteps/Step4.vue';
import Step5ExploracionFisica from '../steps/exploracionFisicaSteps/Step5.vue';
import Step6ExploracionFisica from '../steps/exploracionFisicaSteps/Step6.vue';
import Step7ExploracionFisica from '../steps/exploracionFisicaSteps/Step7.vue';
import Step8ExploracionFisica from '../steps/exploracionFisicaSteps/Step8.vue';
import Step9ExploracionFisica from '../steps/exploracionFisicaSteps/Step9.vue';
import Step10ExploracionFisica from '../steps/exploracionFisicaSteps/Step10.vue';
import Step11ExploracionFisica from '../steps/exploracionFisicaSteps/Step11.vue';
import Step12ExploracionFisica from '../steps/exploracionFisicaSteps/Step12.vue';
import Step13ExploracionFisica from '../steps/exploracionFisicaSteps/Step13.vue';
import Step14ExploracionFisica from '../steps/exploracionFisicaSteps/Step14.vue';
import Step15ExploracionFisica from '../steps/exploracionFisicaSteps/Step15.vue';
import Step16ExploracionFisica from '../steps/exploracionFisicaSteps/Step16.vue';
import Step17ExploracionFisica from '../steps/exploracionFisicaSteps/Step17.vue';
import Step18ExploracionFisica from '../steps/exploracionFisicaSteps/Step18.vue';
import Step19ExploracionFisica from '../steps/exploracionFisicaSteps/Step19.vue';
import Step20ExploracionFisica from '../steps/exploracionFisicaSteps/Step20.vue';
import Step21ExploracionFisica from '../steps/exploracionFisicaSteps/Step21.vue';
import Step22ExploracionFisica from '../steps/exploracionFisicaSteps/Step22.vue';
import Step23ExploracionFisica from '../steps/exploracionFisicaSteps/Step23.vue';
import Step24ExploracionFisica from '../steps/exploracionFisicaSteps/Step24.vue';
import Step25ExploracionFisica from '../steps/exploracionFisicaSteps/Step25.vue';
import Step26ExploracionFisica from '../steps/exploracionFisicaSteps/Step26.vue';
import Step27ExploracionFisica from '../steps/exploracionFisicaSteps/Step27.vue';
import Step28ExploracionFisica from '../steps/exploracionFisicaSteps/Step28.vue';
import Step29ExploracionFisica from '../steps/exploracionFisicaSteps/Step29.vue';
import Step30ExploracionFisica from '../steps/exploracionFisicaSteps/Step30.vue';
import Step31ExploracionFisica from '../steps/exploracionFisicaSteps/Step31.vue';
import Step1HistoriaClinica from '../steps/historiaClinicaSteps/Step1.vue';
import Step2HistoriaClinica from '../steps/historiaClinicaSteps/Step2.vue';
import Step3HistoriaClinica from '../steps/historiaClinicaSteps/Step3.vue';
import Step4HistoriaClinica from '../steps/historiaClinicaSteps/Step4.vue';
import Step5HistoriaClinica from '../steps/historiaClinicaSteps/Step5.vue';
import Step6HistoriaClinica from '../steps/historiaClinicaSteps/Step6.vue';
import Step7HistoriaClinica from '../steps/historiaClinicaSteps/Step7.vue';
import Step8HistoriaClinica from '../steps/historiaClinicaSteps/Step8.vue';
import Step9HistoriaClinica from '../steps/historiaClinicaSteps/Step9.vue';
import Step10HistoriaClinica from '../steps/historiaClinicaSteps/Step10.vue';
import Step11HistoriaClinica from '../steps/historiaClinicaSteps/Step11.vue';
import Step12HistoriaClinica from '../steps/historiaClinicaSteps/Step12.vue';
import Step13HistoriaClinica from '../steps/historiaClinicaSteps/Step13.vue';
import Step14HistoriaClinica from '../steps/historiaClinicaSteps/Step14.vue';
import Step15HistoriaClinica from '../steps/historiaClinicaSteps/Step15.vue';
import Step16HistoriaClinica from '../steps/historiaClinicaSteps/Step16.vue';
import Step17HistoriaClinica from '../steps/historiaClinicaSteps/Step17.vue';
import Step18HistoriaClinica from '../steps/historiaClinicaSteps/Step18.vue';
import Step19HistoriaClinica from '../steps/historiaClinicaSteps/Step19.vue';
import Step20HistoriaClinica from '../steps/historiaClinicaSteps/Step20.vue';
import Step21HistoriaClinica from '../steps/historiaClinicaSteps/Step21.vue';
import Step22HistoriaClinica from '../steps/historiaClinicaSteps/Step22.vue';
import Step23HistoriaClinica from '../steps/historiaClinicaSteps/Step23.vue';
import Step24HistoriaClinica from '../steps/historiaClinicaSteps/Step24.vue';
import Step25HistoriaClinica from '../steps/historiaClinicaSteps/Step25.vue';
import Step26HistoriaClinica from '../steps/historiaClinicaSteps/Step26.vue';
import Step27HistoriaClinica from '../steps/historiaClinicaSteps/Step27.vue';
import Step28HistoriaClinica from '../steps/historiaClinicaSteps/Step28.vue';
import Step29HistoriaClinica from '../steps/historiaClinicaSteps/Step29.vue';
import Step30HistoriaClinica from '../steps/historiaClinicaSteps/Step30.vue';
import Step31HistoriaClinica from '../steps/historiaClinicaSteps/Step31.vue';
import Step32HistoriaClinica from '../steps/historiaClinicaSteps/Step32.vue';
import Step33HistoriaClinica from '../steps/historiaClinicaSteps/Step33.vue';
import Step34HistoriaClinica from '../steps/historiaClinicaSteps/Step34.vue';
import Step35HistoriaClinica from '../steps/historiaClinicaSteps/Step35.vue';
import Step36HistoriaClinica from '../steps/historiaClinicaSteps/Step36.vue';
import Step37HistoriaClinica from '../steps/historiaClinicaSteps/Step37.vue';
import Step38HistoriaClinica from '../steps/historiaClinicaSteps/Step38.vue';
import Step39HistoriaClinica from '../steps/historiaClinicaSteps/Step39.vue';
import Step40HistoriaClinica from '../steps/historiaClinicaSteps/Step40.vue';
import Step41HistoriaClinica from '../steps/historiaClinicaSteps/Step41.vue';
import Step42HistoriaClinica from '../steps/historiaClinicaSteps/Step42.vue';
import Step43HistoriaClinica from '../steps/historiaClinicaSteps/Step43.vue';
import Step44HistoriaClinica from '../steps/historiaClinicaSteps/Step44.vue';
import Step45HistoriaClinica from '../steps/historiaClinicaSteps/Step45.vue';
import Step46HistoriaClinica from '../steps/historiaClinicaSteps/Step46.vue';
import Step1NotaMedica from '../steps/notaMedicaSteps/Step1.vue';
import Step2NotaMedica from '../steps/notaMedicaSteps/Step2.vue';
import Step3NotaMedica from '../steps/notaMedicaSteps/Step3.vue';
import Step4NotaMedica from '../steps/notaMedicaSteps/Step4.vue';
import Step5NotaMedica from '../steps/notaMedicaSteps/Step5.vue';
import Step6NotaMedica from '../steps/notaMedicaSteps/Step6.vue';
import Step7NotaMedica from '../steps/notaMedicaSteps/Step7.vue';
import Step8NotaMedica from '../steps/notaMedicaSteps/Step8.vue';
import Step9NotaMedica from '../steps/notaMedicaSteps/Step9.vue';
import Step10NotaMedica from '../steps/notaMedicaSteps/Step10.vue';
import Step11NotaMedica from '../steps/notaMedicaSteps/Step11.vue';
import Step12NotaMedica from '../steps/notaMedicaSteps/Step12.vue';
import Step13NotaMedica from '../steps/notaMedicaSteps/Step13.vue';
import Step14NotaMedica from '../steps/notaMedicaSteps/Step14.vue';
import Step1NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step1.vue';
import Step2NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step2.vue';
import Step3NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step3.vue';
import Step4NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step4.vue';
import Step5NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step5.vue';
import Step6NotaAclaratoria from '../steps/notaAclaratoriaSteps/Step6.vue';
import Step1ControlPrenatal from '../steps/controlPrenatalSteps/Step1.vue';
import Step2ControlPrenatal from '../steps/controlPrenatalSteps/Step2.vue';
import Step3ControlPrenatal from '../steps/controlPrenatalSteps/Step3.vue';
import Step4ControlPrenatal from '../steps/controlPrenatalSteps/Step4.vue';
import Step5ControlPrenatal from '../steps/controlPrenatalSteps/Step5.vue';
import Step6ControlPrenatal from '../steps/controlPrenatalSteps/Step6.vue';
import Step7ControlPrenatal from '../steps/controlPrenatalSteps/Step7.vue';
import Step8ControlPrenatal from '../steps/controlPrenatalSteps/Step8.vue';
import Step9ControlPrenatal from '../steps/controlPrenatalSteps/Step9.vue';
import Step10ControlPrenatal from '../steps/controlPrenatalSteps/Step10.vue';
import Step11ControlPrenatal from '../steps/controlPrenatalSteps/Step11.vue';
import Step12ControlPrenatal from '../steps/controlPrenatalSteps/Step12.vue';
import Step13ControlPrenatal from '../steps/controlPrenatalSteps/Step13.vue';
import Step14ControlPrenatal from '../steps/controlPrenatalSteps/Step14.vue';
import Step15ControlPrenatal from '../steps/controlPrenatalSteps/Step15.vue';
import Step16ControlPrenatal from '../steps/controlPrenatalSteps/Step16.vue';
import Step17ControlPrenatal from '../steps/controlPrenatalSteps/Step17.vue';
import Step18ControlPrenatal from '../steps/controlPrenatalSteps/Step18.vue';
import Step19ControlPrenatal from '../steps/controlPrenatalSteps/Step19.vue';
import Step20ControlPrenatal from '../steps/controlPrenatalSteps/Step20.vue';
import Step21ControlPrenatal from '../steps/controlPrenatalSteps/Step21.vue';
import Step22ControlPrenatal from '../steps/controlPrenatalSteps/Step22.vue';
import Step23ControlPrenatal from '../steps/controlPrenatalSteps/Step23.vue';
import Step24ControlPrenatal from '../steps/controlPrenatalSteps/Step24.vue';
import Step25ControlPrenatal from '../steps/controlPrenatalSteps/Step25.vue';
import Step26ControlPrenatal from '../steps/controlPrenatalSteps/Step26.vue';
import Step27ControlPrenatal from '../steps/controlPrenatalSteps/Step27.vue';
import Step28ControlPrenatal from '../steps/controlPrenatalSteps/Step28.vue';
import Step29ControlPrenatal from '../steps/controlPrenatalSteps/Step29.vue';
import Step30ControlPrenatal from '../steps/controlPrenatalSteps/Step30.vue';
import Step31ControlPrenatal from '../steps/controlPrenatalSteps/Step31.vue';
import Step32ControlPrenatal from '../steps/controlPrenatalSteps/Step32.vue';
import Step33ControlPrenatal from '../steps/controlPrenatalSteps/Step33.vue';
import Step34ControlPrenatal from '../steps/controlPrenatalSteps/Step34.vue';
import Step35ControlPrenatal from '../steps/controlPrenatalSteps/Step35.vue';
import Step36ControlPrenatal from '../steps/controlPrenatalSteps/Step36.vue';
import Step37ControlPrenatal from '../steps/controlPrenatalSteps/Step37.vue';
import Step38ControlPrenatal from '../steps/controlPrenatalSteps/Step38.vue';
import Step39ControlPrenatal from '../steps/controlPrenatalSteps/Step39.vue';
import Step40ControlPrenatal from '../steps/controlPrenatalSteps/Step40.vue';
import Step41ControlPrenatal from '../steps/controlPrenatalSteps/Step41.vue';
import Step42ControlPrenatal from '../steps/controlPrenatalSteps/Step42.vue';
import Step43ControlPrenatal from '../steps/controlPrenatalSteps/Step43.vue';
import Step44ControlPrenatal from '../steps/controlPrenatalSteps/Step44.vue';
import Step45ControlPrenatal from '../steps/controlPrenatalSteps/Step45.vue';
import Step46ControlPrenatal from '../steps/controlPrenatalSteps/Step46.vue';
import Step47ControlPrenatal from '../steps/controlPrenatalSteps/Step47.vue';
import Step48ControlPrenatal from '../steps/controlPrenatalSteps/Step48.vue';
import Step49ControlPrenatal from '../steps/controlPrenatalSteps/Step49.vue';
import Step50ControlPrenatal from '../steps/controlPrenatalSteps/Step50.vue';
import Step51ControlPrenatal from '../steps/controlPrenatalSteps/Step51.vue';
import Step52ControlPrenatal from '../steps/controlPrenatalSteps/Step52.vue';
import Step53ControlPrenatal from '../steps/controlPrenatalSteps/Step53.vue';
import Step54ControlPrenatal from '../steps/controlPrenatalSteps/Step54.vue';
import Step55ControlPrenatal from '../steps/controlPrenatalSteps/Step55.vue';
import Step56ControlPrenatal from '../steps/controlPrenatalSteps/Step56.vue';
import Step57ControlPrenatal from '../steps/controlPrenatalSteps/Step57.vue';
import Step58ControlPrenatal from '../steps/controlPrenatalSteps/Step58.vue';
import Step59ControlPrenatal from '../steps/controlPrenatalSteps/Step59.vue';
import Step60ControlPrenatal from '../steps/controlPrenatalSteps/Step60.vue';
import Step61ControlPrenatal from '../steps/controlPrenatalSteps/Step61.vue';
import Step62ControlPrenatal from '../steps/controlPrenatalSteps/Step62.vue';
import Step63ControlPrenatal from '../steps/controlPrenatalSteps/Step63.vue';
import Step64ControlPrenatal from '../steps/controlPrenatalSteps/Step64.vue';
import Step65ControlPrenatal from '../steps/controlPrenatalSteps/Step65.vue';
import Step66ControlPrenatal from '../steps/controlPrenatalSteps/Step66.vue';
import Step67ControlPrenatal from '../steps/controlPrenatalSteps/Step67.vue';
import Step68ControlPrenatal from '../steps/controlPrenatalSteps/Step68.vue';
import Step69ControlPrenatal from '../steps/controlPrenatalSteps/Step69.vue';
import Step70ControlPrenatal from '../steps/controlPrenatalSteps/Step70.vue';
import Step71ControlPrenatal from '../steps/controlPrenatalSteps/Step71.vue';
import Step72ControlPrenatal from '../steps/controlPrenatalSteps/Step72.vue';
import Step73ControlPrenatal from '../steps/controlPrenatalSteps/Step73.vue';
import Step74ControlPrenatal from '../steps/controlPrenatalSteps/Step74.vue';
import Step75ControlPrenatal from '../steps/controlPrenatalSteps/Step75.vue';
import Step76ControlPrenatal from '../steps/controlPrenatalSteps/Step76.vue';
import Step77ControlPrenatal from '../steps/controlPrenatalSteps/Step77.vue';
import Step78ControlPrenatal from '../steps/controlPrenatalSteps/Step78.vue';
import Step79ControlPrenatal from '../steps/controlPrenatalSteps/Step79.vue';
import Step80ControlPrenatal from '../steps/controlPrenatalSteps/Step80.vue';
import Step81ControlPrenatal from '../steps/controlPrenatalSteps/Step81.vue';
import Step82ControlPrenatal from '../steps/controlPrenatalSteps/Step82.vue';
import Step83ControlPrenatal from '../steps/controlPrenatalSteps/Step83.vue';
import Step84ControlPrenatal from '../steps/controlPrenatalSteps/Step84.vue';
import Step85ControlPrenatal from '../steps/controlPrenatalSteps/Step85.vue';
import Step86ControlPrenatal from '../steps/controlPrenatalSteps/Step86.vue';
import Step87ControlPrenatal from '../steps/controlPrenatalSteps/Step87.vue';
import Step88ControlPrenatal from '../steps/controlPrenatalSteps/Step88.vue';
import Step89ControlPrenatal from '../steps/controlPrenatalSteps/Step89.vue';
import Step1HistoriaOtologica from '../steps/historiaOtologicaSteps/Step1.vue';
import Step2HistoriaOtologica from '../steps/historiaOtologicaSteps/Step2.vue';
import Step3HistoriaOtologica from '../steps/historiaOtologicaSteps/Step3.vue';
import Step4HistoriaOtologica from '../steps/historiaOtologicaSteps/Step4.vue';
import Step5HistoriaOtologica from '../steps/historiaOtologicaSteps/Step5.vue';
import Step6HistoriaOtologica from '../steps/historiaOtologicaSteps/Step6.vue';
import Step7HistoriaOtologica from '../steps/historiaOtologicaSteps/Step7.vue';
import Step8HistoriaOtologica from '../steps/historiaOtologicaSteps/Step8.vue';
import Step9HistoriaOtologica from '../steps/historiaOtologicaSteps/Step9.vue';
import Step10HistoriaOtologica from '../steps/historiaOtologicaSteps/Step10.vue';
import Step11HistoriaOtologica from '../steps/historiaOtologicaSteps/Step11.vue';
import Step12HistoriaOtologica from '../steps/historiaOtologicaSteps/Step12.vue';
import Step13HistoriaOtologica from '../steps/historiaOtologicaSteps/Step13.vue';
import Step14HistoriaOtologica from '../steps/historiaOtologicaSteps/Step14.vue';
import Step15HistoriaOtologica from '../steps/historiaOtologicaSteps/Step15.vue';
import Step16HistoriaOtologica from '../steps/historiaOtologicaSteps/Step16.vue';
import Step17HistoriaOtologica from '../steps/historiaOtologicaSteps/Step17.vue';
import Step18HistoriaOtologica from '../steps/historiaOtologicaSteps/Step18.vue';
import Step19HistoriaOtologica from '../steps/historiaOtologicaSteps/Step19.vue';
import Step20HistoriaOtologica from '../steps/historiaOtologicaSteps/Step20.vue';
import Step21HistoriaOtologica from '../steps/historiaOtologicaSteps/Step21.vue';
import Step22HistoriaOtologica from '../steps/historiaOtologicaSteps/Step22.vue';
import Step23HistoriaOtologica from '../steps/historiaOtologicaSteps/Step23.vue';
import Step24HistoriaOtologica from '../steps/historiaOtologicaSteps/Step24.vue';
import Step25HistoriaOtologica from '../steps/historiaOtologicaSteps/Step25.vue';
import Step1PrevioEspirometria from '../steps/previoEspirometriaSteps/Step1.vue';
import Step2PrevioEspirometria from '../steps/previoEspirometriaSteps/Step2.vue';
import Step3PrevioEspirometria from '../steps/previoEspirometriaSteps/Step3.vue';
import Step4PrevioEspirometria from '../steps/previoEspirometriaSteps/Step4.vue';
import Step5PrevioEspirometria from '../steps/previoEspirometriaSteps/Step5.vue';
import Step6PrevioEspirometria from '../steps/previoEspirometriaSteps/Step6.vue';
import Step7PrevioEspirometria from '../steps/previoEspirometriaSteps/Step7.vue';
import Step8PrevioEspirometria from '../steps/previoEspirometriaSteps/Step8.vue';
import Step9PrevioEspirometria from '../steps/previoEspirometriaSteps/Step9.vue';
import Step10PrevioEspirometria from '../steps/previoEspirometriaSteps/Step10.vue';
import Step11PrevioEspirometria from '../steps/previoEspirometriaSteps/Step11.vue';
import Step12PrevioEspirometria from '../steps/previoEspirometriaSteps/Step12.vue';
import Step13PrevioEspirometria from '../steps/previoEspirometriaSteps/Step13.vue';
import Step14PrevioEspirometria from '../steps/previoEspirometriaSteps/Step14.vue';
import Step15PrevioEspirometria from '../steps/previoEspirometriaSteps/Step15.vue';
import Step16PrevioEspirometria from '../steps/previoEspirometriaSteps/Step16.vue';
import Step17PrevioEspirometria from '../steps/previoEspirometriaSteps/Step17.vue';
import Step18PrevioEspirometria from '../steps/previoEspirometriaSteps/Step18.vue';
import Step19PrevioEspirometria from '../steps/previoEspirometriaSteps/Step19.vue';
import Step20PrevioEspirometria from '../steps/previoEspirometriaSteps/Step20.vue';
import Step21PrevioEspirometria from '../steps/previoEspirometriaSteps/Step21.vue';
import Step22PrevioEspirometria from '../steps/previoEspirometriaSteps/Step22.vue';
import Step23PrevioEspirometria from '../steps/previoEspirometriaSteps/Step23.vue';
import Step24PrevioEspirometria from '../steps/previoEspirometriaSteps/Step24.vue';
import Step25PrevioEspirometria from '../steps/previoEspirometriaSteps/Step25.vue';
import Step26PrevioEspirometria from '../steps/previoEspirometriaSteps/Step26.vue';
import Step27PrevioEspirometria from '../steps/previoEspirometriaSteps/Step27.vue';
import Step28PrevioEspirometria from '../steps/previoEspirometriaSteps/Step28.vue';
import Step1Receta from '../steps/recetaSteps/Step1.vue';
import Step2Receta from '../steps/recetaSteps/Step2.vue';
import Step3Receta from '../steps/recetaSteps/Step3.vue';
import Step4Receta from '../steps/recetaSteps/Step4.vue';
import Step1ConstanciaAptitud from '../steps/constanciaAptitudSteps/Step1.vue';
import Step1EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step1.vue';
import Step2EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step2.vue';
import Step3EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step3.vue';
import Step4EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step4.vue';
import Step5EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step5.vue';
import Step6EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step6.vue';
import Step7EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step7.vue';
import Step8EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step8.vue';
import Step9EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step9.vue';
import Step10EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step10.vue';
import Step11EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step11.vue';
import Step12EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step12.vue';
import Step13EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step13.vue';
import Step14EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step14.vue';
import Step15EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step15.vue';
import Step16EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step16.vue';
import Step17EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step17.vue';
import Step18EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step18.vue';
import Step19EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step19.vue';
import Step20EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step20.vue';
import Step21EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step21.vue';
import Step22EntrevistaPsicologica from '../steps/entrevistaPsicologicaSteps/Step22.vue';
import Step1TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step1.vue';
import Step2TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step2.vue';
import Step3TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step3.vue';
import Step4TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step4.vue';
import Step5TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step5.vue';
import Step6TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step6.vue';
import Step7TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step7.vue';
import Step8TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step8.vue';
import Step9TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step9.vue';
import Step10TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step10.vue';
import Step11TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step11.vue';
import Step12TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step12.vue';
import Step13TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step13.vue';
import Step14TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step14.vue';
import Step15TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step15.vue';
import Step16TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step16.vue';
import Step17TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step17.vue';
import Step18TrastornosEstadoAnimo from '../steps/trastornosEstadoAnimoSteps/Step18.vue';
import Step1CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step1.vue';
import Step2CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step2.vue';
import Step3CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step3.vue';
import Step4CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step4.vue';
import Step5CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step5.vue';
import Step6CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step6.vue';
import Step7CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step7.vue';
import Step8CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step8.vue';
import Step9CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step9.vue';
import Step10CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step10.vue';
import Step11CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step11.vue';
import Step12CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step12.vue';
import Step13CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step13.vue';
import Step14CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step14.vue';
import Step15CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step15.vue';
import Step16CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step16.vue';
import Step17CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step17.vue';
import Step18CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step18.vue';
import Step19CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step19.vue';
import Step20CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step20.vue';
import Step21CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step21.vue';
import Step22CuestionarioProdromalBreve from '../steps/cuestionarioProdromalBreveSteps/Step22.vue';
import Step1TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step1.vue';
import Step2TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step2.vue';
import Step3TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step3.vue';
import Step4TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step4.vue';
import Step5TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step5.vue';
import Step6TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step6.vue';
import Step7TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step7.vue';
import Step8TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step8.vue';
import Step9TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step9.vue';
import Step10TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step10.vue';
import Step11TrastornoLimitePersonalidad from '../steps/trastornoLimitePersonalidadSteps/Step11.vue';
import Step1EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step1.vue';
import Step2EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step2.vue';
import Step3EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step3.vue';
import Step4EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step4.vue';
import Step5EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step5.vue';
import Step6EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step6.vue';
import Step7EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step7.vue';
import Step8EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step8.vue';
import Step9EventoSeguimientoCardiometabolico from '../steps/eventoSeguimientoCardiometabolicoSteps/Step9.vue';
import Step1InformeLongitudinalCardiometabolico from '../steps/informeLongitudinalCardiometabolicoSteps/Step1.vue';
import Step2InformeLongitudinalCardiometabolico from '../steps/informeLongitudinalCardiometabolicoSteps/Step2.vue';
import Step3InformeLongitudinalCardiometabolico from '../steps/informeLongitudinalCardiometabolicoSteps/Step3.vue';
import ModalFaltanCampos from '../ModalFaltanCampos.vue';
import ModalCamposFaltantes from '../ModalCamposFaltantes.vue';
import DailyConsentModal from '../DailyConsentModal.vue';
import { validarCamposRequeridos, validarNotaMedicaCIEExact4Chars, validarNotaMedicaPreSubmit } from '@/helpers/validacionCampos';
import { validateCIE10Duplicates, generateBlockingToastMessage } from '@/helpers/cie10';
import { validateNotaMedicaDiagnosticos2Y3 } from '@/helpers/notaMedicaDiagnosticosSis';
import MedicoFirmanteAPI from '@/api/MedicoFirmanteAPI';
import EnfermeraFirmanteAPI from '@/api/EnfermeraFirmanteAPI';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useDailyConsentGate } from '@/composables/useDailyConsentGate';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  limpiarControlSinDiagnostico,
  sincronizarEstadoControlAutomatico,
  tieneControlHuerfano,
} from '@/helpers/cardiometabolico/coherenciaClinicaEsc';
import { normalizarCamposAuditoriaPayload } from '@/helpers/mongoId';
import { refrescarEventosConcentradosEnInforme, eventosCmDesdeDocumentsByYear } from '@/helpers/informeLongitudinalTratamiento';
import { aplicarIteracionDosAlFormulario } from '@/helpers/informeLongitudinalOperativo';
import { coherenciaCtxDesdeSexo } from '@/helpers/informeLongitudinalCoherenciaEsc';
import {
  indicePasoP3Mdq,
  indicePasoP4Mdq,
  indicePasoP5Mdq,
  requierePaso15SituacionesMismoPeriodo,
} from '@/helpers/trastornosEstadoAnimoSteps';
import {
  construirRutaPdfNotaAclaratoria,
  inicializarNotaAclaratoriaNueva,
} from '@/helpers/notaAclaratoriaForm';

export default {
  components: { Step1Antidoping, Step2Antidoping, Step1Aptitud, Step2Aptitud, Step3Aptitud, Step4Aptitud, Step5Aptitud, Step6Aptitud, Step7Aptitud, Step8Aptitud, Step9Aptitud, Step10Aptitud, Step11Aptitud, Step1Audiometria, Step2Audiometria, Step3Audiometria, Step4Audiometria, Step5Audiometria, Step6Audiometria, Step7Audiometria, Step1Certificado, Step2Certificado, Step1CertificadoExpedito, Step2CertificadoExpedito, Step3CertificadoExpedito, Step4CertificadoExpedito, Step5CertificadoExpedito, Step6CertificadoExpedito, Step7CertificadoExpedito, Step8CertificadoExpedito, Step1ExamenVista, Step2ExamenVista, Step3ExamenVista, Step4ExamenVista, Step5ExamenVista, Step6ExamenVista, Step7ExamenVista, Step8ExamenVista, Step9ExamenVista, Step1ExploracionFisica, Step2ExploracionFisica, Step3ExploracionFisica, Step4ExploracionFisica, Step5ExploracionFisica, Step6ExploracionFisica, Step7ExploracionFisica, Step8ExploracionFisica, Step9ExploracionFisica, Step10ExploracionFisica, Step11ExploracionFisica, Step12ExploracionFisica, Step13ExploracionFisica, Step14ExploracionFisica, Step15ExploracionFisica, Step16ExploracionFisica, Step17ExploracionFisica, Step18ExploracionFisica, Step19ExploracionFisica, Step20ExploracionFisica, Step21ExploracionFisica, Step22ExploracionFisica, Step23ExploracionFisica, Step24ExploracionFisica, Step25ExploracionFisica, Step26ExploracionFisica, Step27ExploracionFisica, Step28ExploracionFisica, Step29ExploracionFisica, Step30ExploracionFisica, Step31ExploracionFisica, Step1HistoriaClinica, Step2HistoriaClinica, Step3HistoriaClinica, Step4HistoriaClinica, Step5HistoriaClinica, Step6HistoriaClinica, Step7HistoriaClinica, Step8HistoriaClinica, Step9HistoriaClinica, Step10HistoriaClinica, Step11HistoriaClinica, Step12HistoriaClinica, Step13HistoriaClinica, Step14HistoriaClinica, Step15HistoriaClinica, Step16HistoriaClinica, Step17HistoriaClinica, Step18HistoriaClinica, Step19HistoriaClinica, Step20HistoriaClinica, Step21HistoriaClinica, Step22HistoriaClinica, Step23HistoriaClinica, Step24HistoriaClinica, Step25HistoriaClinica, Step26HistoriaClinica, Step27HistoriaClinica, Step28HistoriaClinica, Step29HistoriaClinica, Step30HistoriaClinica, Step31HistoriaClinica, Step32HistoriaClinica, Step33HistoriaClinica, Step34HistoriaClinica, Step35HistoriaClinica, Step36HistoriaClinica, Step37HistoriaClinica, Step38HistoriaClinica, Step39HistoriaClinica, Step40HistoriaClinica, Step41HistoriaClinica, Step42HistoriaClinica, Step43HistoriaClinica, Step44HistoriaClinica, Step45HistoriaClinica, Step46HistoriaClinica, Step1NotaMedica, Step2NotaMedica, Step3NotaMedica, Step4NotaMedica, Step5NotaMedica, Step6NotaMedica, Step7NotaMedica, Step8NotaMedica, Step9NotaMedica, Step10NotaMedica, Step11NotaMedica, Step12NotaMedica, Step13NotaMedica, Step14NotaMedica, Step1NotaAclaratoria, Step1ControlPrenatal, Step2ControlPrenatal, Step3ControlPrenatal, Step4ControlPrenatal, Step5ControlPrenatal, Step6ControlPrenatal, Step7ControlPrenatal, Step8ControlPrenatal, Step9ControlPrenatal, Step10ControlPrenatal, Step11ControlPrenatal, Step12ControlPrenatal, Step13ControlPrenatal, Step14ControlPrenatal, Step15ControlPrenatal, Step16ControlPrenatal, Step17ControlPrenatal, Step18ControlPrenatal, Step19ControlPrenatal, Step20ControlPrenatal, Step21ControlPrenatal, Step22ControlPrenatal, Step23ControlPrenatal, Step24ControlPrenatal, Step25ControlPrenatal, Step26ControlPrenatal, Step27ControlPrenatal, Step28ControlPrenatal, Step29ControlPrenatal, Step30ControlPrenatal, Step31ControlPrenatal, Step32ControlPrenatal, Step33ControlPrenatal, Step34ControlPrenatal, Step35ControlPrenatal, Step36ControlPrenatal, Step37ControlPrenatal, Step38ControlPrenatal, Step39ControlPrenatal, Step40ControlPrenatal, Step41ControlPrenatal, Step42ControlPrenatal, Step43ControlPrenatal, Step44ControlPrenatal, Step45ControlPrenatal, Step46ControlPrenatal, Step47ControlPrenatal, Step48ControlPrenatal, Step49ControlPrenatal, Step50ControlPrenatal, Step51ControlPrenatal, Step52ControlPrenatal, Step53ControlPrenatal, Step54ControlPrenatal, Step55ControlPrenatal, Step56ControlPrenatal, Step57ControlPrenatal, Step58ControlPrenatal, Step59ControlPrenatal, Step60ControlPrenatal, Step61ControlPrenatal, Step62ControlPrenatal, Step63ControlPrenatal, Step64ControlPrenatal, Step65ControlPrenatal, Step66ControlPrenatal, Step67ControlPrenatal, Step68ControlPrenatal, Step69ControlPrenatal, Step70ControlPrenatal, Step71ControlPrenatal, Step72ControlPrenatal, Step73ControlPrenatal, Step74ControlPrenatal, Step75ControlPrenatal, Step76ControlPrenatal, Step77ControlPrenatal, Step78ControlPrenatal, Step79ControlPrenatal, Step80ControlPrenatal, Step81ControlPrenatal, Step82ControlPrenatal, Step83ControlPrenatal, Step84ControlPrenatal, Step85ControlPrenatal, Step86ControlPrenatal, Step87ControlPrenatal, Step88ControlPrenatal, Step89ControlPrenatal, Step1HistoriaOtologica, Step2HistoriaOtologica, Step3HistoriaOtologica, Step4HistoriaOtologica, Step5HistoriaOtologica, Step6HistoriaOtologica, Step7HistoriaOtologica, Step8HistoriaOtologica, Step9HistoriaOtologica, Step10HistoriaOtologica, Step11HistoriaOtologica, Step12HistoriaOtologica, Step13HistoriaOtologica, Step14HistoriaOtologica, Step15HistoriaOtologica, Step16HistoriaOtologica, Step17HistoriaOtologica, Step18HistoriaOtologica, Step19HistoriaOtologica, Step20HistoriaOtologica, Step21HistoriaOtologica, Step22HistoriaOtologica, Step23HistoriaOtologica, Step24HistoriaOtologica, Step25HistoriaOtologica, Step1PrevioEspirometria, Step2PrevioEspirometria, Step3PrevioEspirometria, Step4PrevioEspirometria, Step5PrevioEspirometria, Step6PrevioEspirometria, Step7PrevioEspirometria, Step8PrevioEspirometria, Step9PrevioEspirometria, Step10PrevioEspirometria, Step11PrevioEspirometria, Step12PrevioEspirometria, Step13PrevioEspirometria, Step14PrevioEspirometria, Step15PrevioEspirometria, Step16PrevioEspirometria, Step17PrevioEspirometria, Step18PrevioEspirometria, Step19PrevioEspirometria, Step20PrevioEspirometria, Step21PrevioEspirometria, Step22PrevioEspirometria, Step23PrevioEspirometria, Step24PrevioEspirometria, Step25PrevioEspirometria, Step26PrevioEspirometria, Step27PrevioEspirometria, Step28PrevioEspirometria, Step1Receta, Step2Receta, Step3Receta, Step4Receta, Step1ConstanciaAptitud, Step1EntrevistaPsicologica, Step2EntrevistaPsicologica, Step3EntrevistaPsicologica, Step4EntrevistaPsicologica, Step5EntrevistaPsicologica, Step6EntrevistaPsicologica, Step7EntrevistaPsicologica, Step8EntrevistaPsicologica, Step9EntrevistaPsicologica, Step10EntrevistaPsicologica, Step11EntrevistaPsicologica, Step12EntrevistaPsicologica, Step13EntrevistaPsicologica, Step14EntrevistaPsicologica, Step15EntrevistaPsicologica, Step16EntrevistaPsicologica, Step17EntrevistaPsicologica, Step18EntrevistaPsicologica, Step19EntrevistaPsicologica, Step20EntrevistaPsicologica, Step21EntrevistaPsicologica, Step22EntrevistaPsicologica, Step1TrastornosEstadoAnimo, Step2TrastornosEstadoAnimo, Step3TrastornosEstadoAnimo, Step4TrastornosEstadoAnimo, Step5TrastornosEstadoAnimo, Step6TrastornosEstadoAnimo, Step7TrastornosEstadoAnimo, Step8TrastornosEstadoAnimo, Step9TrastornosEstadoAnimo, Step10TrastornosEstadoAnimo, Step11TrastornosEstadoAnimo, Step12TrastornosEstadoAnimo, Step13TrastornosEstadoAnimo, Step14TrastornosEstadoAnimo, Step15TrastornosEstadoAnimo, Step16TrastornosEstadoAnimo, Step17TrastornosEstadoAnimo, Step18TrastornosEstadoAnimo, Step1CuestionarioProdromalBreve, Step2CuestionarioProdromalBreve, Step3CuestionarioProdromalBreve, Step4CuestionarioProdromalBreve, Step5CuestionarioProdromalBreve, Step6CuestionarioProdromalBreve, Step7CuestionarioProdromalBreve, Step8CuestionarioProdromalBreve, Step9CuestionarioProdromalBreve, Step10CuestionarioProdromalBreve, Step11CuestionarioProdromalBreve, Step12CuestionarioProdromalBreve, Step13CuestionarioProdromalBreve, Step14CuestionarioProdromalBreve, Step15CuestionarioProdromalBreve, Step16CuestionarioProdromalBreve, Step17CuestionarioProdromalBreve, Step18CuestionarioProdromalBreve, Step19CuestionarioProdromalBreve, Step20CuestionarioProdromalBreve, Step21CuestionarioProdromalBreve, Step22CuestionarioProdromalBreve, Step1TrastornoLimitePersonalidad, Step2TrastornoLimitePersonalidad, Step3TrastornoLimitePersonalidad, Step4TrastornoLimitePersonalidad, Step5TrastornoLimitePersonalidad, Step6TrastornoLimitePersonalidad, Step7TrastornoLimitePersonalidad, Step8TrastornoLimitePersonalidad, Step9TrastornoLimitePersonalidad, Step10TrastornoLimitePersonalidad, Step11TrastornoLimitePersonalidad, Step1EventoSeguimientoCardiometabolico, Step2EventoSeguimientoCardiometabolico, Step3EventoSeguimientoCardiometabolico, Step4EventoSeguimientoCardiometabolico, Step5EventoSeguimientoCardiometabolico, Step6EventoSeguimientoCardiometabolico, Step7EventoSeguimientoCardiometabolico, Step8EventoSeguimientoCardiometabolico, Step9EventoSeguimientoCardiometabolico, Step1InformeLongitudinalCardiometabolico, Step2InformeLongitudinalCardiometabolico, Step3InformeLongitudinalCardiometabolico, ModalFaltanCampos, ModalCamposFaltantes, DailyConsentModal },
  setup() {
    const empresas = useEmpresasStore();
    const trabajadores = useTrabajadoresStore();
    const centrosTrabajo = useCentrosTrabajoStore();
    const formData = useFormDataStore();
    const documentos = useDocumentosStore();
    const stepsStore = useStepsStore();
    const proveedorSaludStore = useProveedorSaludStore();
    const userStore = useUserStore();
    const router = useRouter();
    const route = useRoute();

    const toast = inject('toast');

    const isMX = computed(() => proveedorSaludStore.isMX);
    const isFinalized = computed(() => documentos.isFinalized);
    const regulatoryPolicy = computed(() => proveedorSaludStore.regulatoryPolicy);
    const showSiresUI = computed(() => proveedorSaludStore.showSiresUI);
    const notaAclaratoriaEnabled = computed(() => proveedorSaludStore.notaAclaratoriaEnabled);
    const { cie10Required } = useNom024Fields();
    
    // Composable para manejar el gate de consentimiento diario
    const {
      runWithDailyConsent,
      showModal: showConsentModal,
      modalTrabajadorId,
      modalTrabajadorNombre,
      modalTrabajadorSexo,
      handleConsentRegistered,
      handleConsentCancel,
    } = useDailyConsentGate();
    
    // Computed para verificar si el documento está finalizado
    const isFinalizado = computed(() => {
      if (!documentos.currentDocument) return false;
      return documentos.currentDocument.estado?.toLowerCase() === 'finalizado';
    });
    
    // Computed para verificar si el documento está anulado
    const isAnulado = computed(() => {
      if (!documentos.currentDocument) return false;
      return documentos.currentDocument.estado?.toLowerCase() === 'anulado';
    });

    const tipoSingularAPlural = {
        'antidoping': 'antidopings',
        'aptitud': 'aptitudes',
        'audiometria': 'audiometrias',
        'certificado': 'certificados',
        'certificadoExpedito': 'certificadosExpedito',
        'documentoExterno': 'documentosExternos',
        'examenVista': 'examenesVista',
        'exploracionFisica': 'exploracionesFisicas',
        'historiaClinica': 'historiasClinicas',
        'notaMedica': 'notasMedicas',
        'controlPrenatal': 'controlPrenatal',
        'historiaOtologica': 'historiaOtologica',
        'previoEspirometria': 'previoEspirometria',
        'receta': 'recetas',
        'constanciaAptitud': 'constanciasAptitud'
    };

    const normalizarTipoAPlural = (tipo) => {
        if (!tipo) return tipo;
        const normalizado = tipo.replace(/\s+/g, '');
        if (tipoSingularAPlural[tipo]) return tipoSingularAPlural[tipo];
        const camelCase = normalizado.charAt(0).toLowerCase() + normalizado.slice(1);
        if (tipoSingularAPlural[camelCase]) return tipoSingularAPlural[camelCase];
        if (tipoSingularAPlural[normalizado]) return tipoSingularAPlural[normalizado];
        return tipo;
    };

    const bootstrapNotaAclaratoriaNueva = (opts = {}) => {
      const empresa = empresas.currentEmpresa?.nombreComercial;
      const centro = centrosTrabajo.currentCentroTrabajo?.nombreCentro;
      const trabajadorNombre = trabajadores.currentTrabajador?.nombre;
      const trabajadorId = trabajadores.currentTrabajadorId;

      if (!empresa || !centro || !trabajadorNombre || !trabajadorId) return;

      inicializarNotaAclaratoriaNueva({
        form: formData.formDataNotaAclaratoria,
        trabajadorId,
        rutaPDF: construirRutaPdfNotaAclaratoria(empresa, centro, trabajadorNombre, trabajadorId),
        userId: userStore.user?._id,
        documentoOrigenTipo: opts.documentoOrigenTipo ?? formData.formDataNotaAclaratoria.documentoOrigenTipo,
        documentoOrigenId: opts.documentoOrigenId ?? formData.formDataNotaAclaratoria.documentoOrigenId,
        documentoOrigen: opts.documentoOrigen ?? null,
      });
    };

    const crearNotaAclaratoria = () => {
      const tipoOriginal = documentos.currentTypeOfDocument;
      const documentoOrigen = documentos.currentDocument;
      const idOriginal = documentoOrigen?._id;
      
      console.log('🚀 Iniciando creación de Nota Aclaratoria:', {
        tipoOriginal,
        idOriginal,
        currentDocument: documentoOrigen
      });
      
      if (!tipoOriginal || !idOriginal) {
        console.warn('❌ No se puede crear nota aclaratoria: faltan datos', { tipoOriginal, idOriginal });
        return;
      }

      const tipoPlural = normalizarTipoAPlural(tipoOriginal);
      
      console.log('📝 Navegando a crear nota aclaratoria con:', {
        documentoOrigenTipo: tipoPlural,
        documentoOrigenId: idOriginal,
        idEmpresa: empresas.currentEmpresaId,
        idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
        idTrabajador: trabajadores.currentTrabajadorId
      });
      
      // Step1/Step2 se omiten con skipToStep: inicializar fecha, auditoría y metadatos del origen
      bootstrapNotaAclaratoriaNueva({
        documentoOrigenTipo: tipoPlural,
        documentoOrigenId: idOriginal,
        documentoOrigen,
      });
      
      console.log('💾 Valores establecidos en store ANTES de navegar:', {
        documentoOrigenTipo: formData.formDataNotaAclaratoria.documentoOrigenTipo,
        documentoOrigenId: formData.formDataNotaAclaratoria.documentoOrigenId,
        fechaNotaAclaratoria: formData.formDataNotaAclaratoria.fechaNotaAclaratoria,
      });
      
      // Limpiar el documento actual antes de navegar para que el nuevo formulario inicie desde el paso 1
      documentos.currentDocument = null;
      
      router.push({
        name: 'crear-documento',
        params: {
          idEmpresa: empresas.currentEmpresaId,
          idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
          idTrabajador: trabajadores.currentTrabajadorId,
          tipoDocumento: 'notaAclaratoria'
        },
        query: {
          documentoOrigenTipo: tipoPlural,
          documentoOrigenId: idOriginal,
          skipToStep: '3' // Saltar directamente al paso 3
        }
      });
    };
    
    // Usar policy regulatoria en lugar de isMX para decisiones regulatorias
    // documentImmutabilityEnabled solo es true para SIRES_NOM024
    const documentImmutabilityEnabled = computed(() => 
      proveedorSaludStore.documentImmutabilityEnabled
    );
    const disableEdit = computed(() => 
      documentImmutabilityEnabled.value && isFinalized.value
    );

    // Computed properties para mejor UX
    const progressPercentage = computed(() => {
      const len = stepsStore.steps.length;
      if (!len) return 0;
      const pasosCompletados = Math.max(0, stepsStore.currentStep - 1);
      return Math.round((pasosCompletados / len) * 100);
    });

    const currentStepDisplay = computed(() => {
      return Math.min(stepsStore.currentStep, stepsStore.steps.length);
    });

    /** Remonta pasos del informe longitudinal tras hidratar `_id` desde el GET (evita refs vacíos). */
    const dynamicStepComponentKey = computed(() => {
      const step = stepsStore.currentStep;
      if (documentos.currentTypeOfDocument !== 'informeLongitudinalCardiometabolico') {
        return String(step);
      }
      const fm = formData.formDataInformeLongitudinalCardiometabolico;
      const hid = fm?._id ?? documentos.currentDocument?._id ?? 'nuevo';
      return `ilcm-${step}-${hid}`;
    });

    // Info de auditoría del documento (creado por / actualizado por) - solo en modo edición
    const documentAuditInfo = computed(() => {
      const doc = documentos.currentDocument;
      if (!doc) return null;

      const createdBy = doc.createdBy;
      const updatedBy = doc.updatedBy;

      const createdByUsername = typeof createdBy === 'object' && createdBy?.username
        ? createdBy.username
        : null;
      const updatedByUsername = typeof updatedBy === 'object' && updatedBy?.username
        ? updatedBy.username
        : null;

      // Si no hay username (backend sin populate o usuario eliminado), no mostrar
      if (!createdByUsername && !updatedByUsername) return null;

      const createdById = typeof createdBy === 'object' ? createdBy?._id : createdBy;
      const updatedById = typeof updatedBy === 'object' ? updatedBy?._id : updatedBy;
      const isSameUser = createdById && updatedById && String(createdById) === String(updatedById);

      return {
        createdByUsername: createdByUsername || 'Usuario desconocido',
        updatedByUsername: updatedByUsername || 'Usuario desconocido',
        createdById,
        updatedById,
        isSameUser,
      };
    });

    const formatUsername = (username, userId) => {
      if (!username || username === 'Usuario desconocido') return username;
      const currentUserId = userStore.user?._id;
      if (!currentUserId || !userId) return username;
      return String(userId) === String(currentUserId) ? username + ' (Yo)' : username;
    };

    /**
     * Pasos 1–14 fijos; paso 15 (P2) si ≥2 "Sí" en P1; P3–P5 después (índices según P2).
     * @see requierePaso15SituacionesMismoPeriodo, indicePasoP3Mdq, indicePasoP4Mdq, indicePasoP5Mdq
     */
    function aplicarPasosTrastornosEstadoAnimo(preservarPasoActual) {
      if (documentos.currentTypeOfDocument !== 'trastornosEstadoAnimo') return;

      const fd = formData.formDataTrastornosEstadoAnimo;
      const pasos = [
        { component: Step1TrastornosEstadoAnimo, name: 'Paso 1' },
        { component: Step2TrastornosEstadoAnimo, name: 'Paso 2' },
        { component: Step3TrastornosEstadoAnimo, name: 'Paso 3' },
        { component: Step4TrastornosEstadoAnimo, name: 'Paso 4' },
        { component: Step5TrastornosEstadoAnimo, name: 'Paso 5' },
        { component: Step6TrastornosEstadoAnimo, name: 'Paso 6' },
        { component: Step7TrastornosEstadoAnimo, name: 'Paso 7' },
        { component: Step8TrastornosEstadoAnimo, name: 'Paso 8' },
        { component: Step9TrastornosEstadoAnimo, name: 'Paso 9' },
        { component: Step10TrastornosEstadoAnimo, name: 'Paso 10' },
        { component: Step11TrastornosEstadoAnimo, name: 'Paso 11' },
        { component: Step12TrastornosEstadoAnimo, name: 'Paso 12' },
        { component: Step13TrastornosEstadoAnimo, name: 'Paso 13' },
        { component: Step14TrastornosEstadoAnimo, name: 'Paso 14' },
      ];
      if (requierePaso15SituacionesMismoPeriodo(fd)) {
        pasos.push({ component: Step15TrastornosEstadoAnimo, name: 'Paso 15' });
      } else {
        fd.p2SituacionesMismoPeriodo = undefined;
      }
      pasos.push({
        component: Step16TrastornosEstadoAnimo,
        name: `Paso ${indicePasoP3Mdq(fd)}`,
      });
      pasos.push({
        component: Step17TrastornosEstadoAnimo,
        name: `Paso ${indicePasoP4Mdq(fd)}`,
      });
      pasos.push({
        component: Step18TrastornosEstadoAnimo,
        name: `Paso ${indicePasoP5Mdq(fd)}`,
      });
      stepsStore.setSteps(pasos, { preserveCurrentStep: preservarPasoActual });
    }

    watch(
      () => formData.formDataTrastornosEstadoAnimo,
      () => {
        if (documentos.currentTypeOfDocument === 'trastornosEstadoAnimo') {
          aplicarPasosTrastornosEstadoAnimo(true);
        }
      },
      { deep: true }
    );

    // Establece los pasos al montar el componente
    onMounted(() => {
      documentos.setCurrentTypeOfDocument(route.params.tipoDocumento);

      if (documentos.currentTypeOfDocument === 'antidoping') {
        stepsStore.setSteps([
          { component: Step1Antidoping, name: 'Paso 1' },
          { component: Step2Antidoping, name: 'Paso 2' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'aptitud') {
        stepsStore.setSteps([
          { component: Step1Aptitud, name: 'Paso 1' },
          { component: Step2Aptitud, name: 'Paso 2' },
          { component: Step3Aptitud, name: 'Paso 3' },
          { component: Step4Aptitud, name: 'Paso 4' },
          { component: Step5Aptitud, name: 'Paso 5' },
          { component: Step6Aptitud, name: 'Paso 6' },
          { component: Step7Aptitud, name: 'Paso 7' },
          { component: Step8Aptitud, name: 'Paso 8' },
          { component: Step9Aptitud, name: 'Paso 9' },
          { component: Step10Aptitud, name: 'Paso 10' },
          { component: Step11Aptitud, name: 'Paso 11' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'audiometria') {
        stepsStore.setSteps([
          { component: Step1Audiometria, name: 'Paso 1' },
          { component: Step2Audiometria, name: 'Paso 2' },
          { component: Step3Audiometria, name: 'Paso 3' },
          { component: Step4Audiometria, name: 'Paso 4' },
          { component: Step5Audiometria, name: 'Paso 5' },
          { component: Step6Audiometria, name: 'Paso 6' },
          { component: Step7Audiometria, name: 'Paso 7' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'certificado') {
        stepsStore.setSteps([
          { component: Step1Certificado, name: 'Paso 1' },
          { component: Step2Certificado, name: 'Paso 2' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'certificadoExpedito') {
        stepsStore.setSteps([
          { component: Step1CertificadoExpedito, name: 'Paso 1' },
          { component: Step2CertificadoExpedito, name: 'Paso 2' },
          { component: Step3CertificadoExpedito, name: 'Paso 3' },
          { component: Step4CertificadoExpedito, name: 'Paso 4' },
          { component: Step5CertificadoExpedito, name: 'Paso 5' },
          { component: Step6CertificadoExpedito, name: 'Paso 6' },
          { component: Step7CertificadoExpedito, name: 'Paso 7' },
          { component: Step8CertificadoExpedito, name: 'Paso 8' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'examenVista') {
        // Obtener el país del proveedor de salud
        const proveedorSalud = JSON.parse(localStorage.getItem('proveedorSalud')) || null;
        const paisProveedor = proveedorSalud?.pais || '';
        
        // Steps base (Fecha, AV Lejana, AV Cercana, AV Con Lejana, AV Con Cercana, Ishihara)
        const stepsBase = [
          { component: Step1ExamenVista, name: 'Paso 1' },
          { component: Step2ExamenVista, name: 'Paso 2' },
          { component: Step3ExamenVista, name: 'Paso 3' },
          { component: Step4ExamenVista, name: 'Paso 4' },
          { component: Step5ExamenVista, name: 'Paso 5' },
          { component: Step6ExamenVista, name: 'Paso 6' },
        ];
        
        let examenVistaSteps;
        if (paisProveedor === 'GT') {
          // Guatemala: Fecha primero; luego Antecedentes, Anamnesis, Utiliza anteojos; luego AV e Ishihara; luego 7, 8, 9
          examenVistaSteps = [
            { component: Step1ExamenVista, name: 'Paso 1' },
            { component: StepAntecedentesGT, name: 'Paso 2' },
            { component: StepAnamnesisGT, name: 'Paso 3' },
            { component: StepUtilizaAnteojosGT, name: 'Paso 4' },
            { component: Step2ExamenVista, name: 'Paso 5' },
            { component: Step3ExamenVista, name: 'Paso 6' },
            { component: Step4ExamenVista, name: 'Paso 7' },
            { component: Step5ExamenVista, name: 'Paso 8' },
            { component: Step6ExamenVista, name: 'Paso 9' },
            { component: Step7ExamenVista, name: 'Paso 10' },
            { component: Step8ExamenVista, name: 'Paso 11' },
            { component: Step9ExamenVista, name: 'Paso 12' }
          ];
        } else {
          examenVistaSteps = stepsBase;
        }
        
        stepsStore.setSteps(examenVistaSteps);
      } else if (documentos.currentTypeOfDocument === 'exploracionFisica') {
        stepsStore.setSteps([
          { component: Step1ExploracionFisica, name: 'Paso 1' },
          { component: Step2ExploracionFisica, name: 'Paso 2' },
          { component: Step3ExploracionFisica, name: 'Paso 3' },
          { component: Step4ExploracionFisica, name: 'Paso 4' },
          { component: Step5ExploracionFisica, name: 'Paso 5' },
          { component: Step6ExploracionFisica, name: 'Paso 6' },
          { component: Step7ExploracionFisica, name: 'Paso 7' },
          { component: Step8ExploracionFisica, name: 'Paso 8' },
          { component: Step9ExploracionFisica, name: 'Paso 9' },
          { component: Step10ExploracionFisica, name: 'Paso 10' },
          { component: Step11ExploracionFisica, name: 'Paso 11' },
          { component: Step12ExploracionFisica, name: 'Paso 12' },
          { component: Step13ExploracionFisica, name: 'Paso 13' },
          { component: Step14ExploracionFisica, name: 'Paso 14' },
          { component: Step15ExploracionFisica, name: 'Paso 15' },
          { component: Step16ExploracionFisica, name: 'Paso 16' },
          { component: Step17ExploracionFisica, name: 'Paso 17' },
          { component: Step18ExploracionFisica, name: 'Paso 18' },
          { component: Step19ExploracionFisica, name: 'Paso 19' },
          { component: Step20ExploracionFisica, name: 'Paso 20' },
          { component: Step21ExploracionFisica, name: 'Paso 21' },
          { component: Step22ExploracionFisica, name: 'Paso 22' },
          { component: Step23ExploracionFisica, name: 'Paso 23' },
          { component: Step24ExploracionFisica, name: 'Paso 24' },
          { component: Step25ExploracionFisica, name: 'Paso 25' },
          { component: Step26ExploracionFisica, name: 'Paso 26' },
          { component: Step27ExploracionFisica, name: 'Paso 27' },
          { component: Step28ExploracionFisica, name: 'Paso 28' },
          { component: Step29ExploracionFisica, name: 'Paso 29' },
          { component: Step30ExploracionFisica, name: 'Paso 30' },
          { component: Step31ExploracionFisica, name: 'Paso 31' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'historiaClinica') {
        const historiaClinicaSteps = [
          { component: Step1HistoriaClinica, name: 'Paso 1' },
          { component: Step2HistoriaClinica, name: 'Paso 2' },
          { component: Step3HistoriaClinica, name: 'Paso 3' },
          { component: Step4HistoriaClinica, name: 'Paso 4' },
          { component: Step5HistoriaClinica, name: 'Paso 5' },
          { component: Step6HistoriaClinica, name: 'Paso 6' },
          { component: Step7HistoriaClinica, name: 'Paso 7' },
          { component: Step8HistoriaClinica, name: 'Paso 8' },
          { component: Step9HistoriaClinica, name: 'Paso 9' },
          { component: Step10HistoriaClinica, name: 'Paso 10' },
          { component: Step11HistoriaClinica, name: 'Paso 11' },
          { component: Step12HistoriaClinica, name: 'Paso 12' },
          { component: Step13HistoriaClinica, name: 'Paso 13' },
          { component: Step14HistoriaClinica, name: 'Paso 14' },
          { component: Step15HistoriaClinica, name: 'Paso 15' },
          { component: Step16HistoriaClinica, name: 'Paso 16' },
          { component: Step17HistoriaClinica, name: 'Paso 17' },
          { component: Step18HistoriaClinica, name: 'Paso 18' },
          { component: Step19HistoriaClinica, name: 'Paso 19' },
          { component: Step20HistoriaClinica, name: 'Paso 20' },
          { component: Step21HistoriaClinica, name: 'Paso 21' },
          { component: Step22HistoriaClinica, name: 'Paso 22' },
          { component: Step23HistoriaClinica, name: 'Paso 23' },
          { component: Step24HistoriaClinica, name: 'Paso 24' },
          { component: Step25HistoriaClinica, name: 'Paso 25' },
          { component: Step26HistoriaClinica, name: 'Paso 26' },
          { component: Step27HistoriaClinica, name: 'Paso 27' }
        ];

        // Agregar pasos condicionalmente según el sexo del trabajador
        if (trabajadores.currentTrabajador?.sexo === 'Femenino') {
          historiaClinicaSteps.push(
            { component: Step28HistoriaClinica, name: 'Paso 28' },
            { component: Step29HistoriaClinica, name: 'Paso 29' },
            { component: Step30HistoriaClinica, name: 'Paso 30' },
            { component: Step31HistoriaClinica, name: 'Paso 31' },
            { component: Step32HistoriaClinica, name: 'Paso 32' },
            { component: Step33HistoriaClinica, name: 'Paso 33' },
            { component: Step34HistoriaClinica, name: 'Paso 34' },
            { component: Step35HistoriaClinica, name: 'Paso 35' },
            { component: Step36HistoriaClinica, name: 'Paso 36' },
            { component: Step37HistoriaClinica, name: 'Paso 37' },
            { component: Step38HistoriaClinica, name: 'Paso 38' },
            { component: Step39HistoriaClinica, name: 'Paso 39' },
            { component: Step40HistoriaClinica, name: 'Paso 40' },
            { component: Step41HistoriaClinica, name: 'Paso 41' },
          );
        }

        historiaClinicaSteps.push(
          { component: Step42HistoriaClinica, name: 'Paso 42' },
          { component: Step43HistoriaClinica, name: 'Paso 43' },
          { component: Step44HistoriaClinica, name: 'Paso 44' },
          { component: Step45HistoriaClinica, name: 'Paso 45' },
          { component: Step46HistoriaClinica, name: 'Paso 46' }
        );

        stepsStore.setSteps(historiaClinicaSteps);
      } else if (documentos.currentTypeOfDocument === 'notaMedica') {
        const notaMedicaSteps = [
          { component: Step1NotaMedica, name: 'Paso 1' },
          { component: Step2NotaMedica, name: 'Paso 2' },
        ];

        if (showSiresUI.value) {
          notaMedicaSteps.push({ component: Step3NotaMedica, name: `Paso ${notaMedicaSteps.length + 1}` });
        }

        notaMedicaSteps.push(
          { component: Step4NotaMedica, name: `Paso ${notaMedicaSteps.length + 1}` },
          { component: Step5NotaMedica, name: `Paso ${notaMedicaSteps.length + 2}` },
          { component: Step6NotaMedica, name: `Paso ${notaMedicaSteps.length + 3}` },
        );

        if (showSiresUI.value) {
          notaMedicaSteps.push(
            { component: Step7NotaMedica, name: `Paso ${notaMedicaSteps.length + 1}` },
            { component: Step8NotaMedica, name: `Paso ${notaMedicaSteps.length + 2}` },
          );
        }

        notaMedicaSteps.push(
          { component: Step9NotaMedica, name: `Paso ${notaMedicaSteps.length + 1}` },
          { component: Step10NotaMedica, name: `Paso ${notaMedicaSteps.length + 2}` },
          { component: Step11NotaMedica, name: `Paso ${notaMedicaSteps.length + 3}` },
          { component: Step12NotaMedica, name: `Paso ${notaMedicaSteps.length + 4}` },
          { component: Step13NotaMedica, name: `Paso ${notaMedicaSteps.length + 5}` },
          { component: Step14NotaMedica, name: `Paso ${notaMedicaSteps.length + 6}` },
        );

        stepsStore.setSteps(notaMedicaSteps);
      } else if (documentos.currentTypeOfDocument === 'notaAclaratoria') {
        stepsStore.setSteps([
          { component: Step1NotaAclaratoria, name: 'Paso 1' },
          { component: Step2NotaAclaratoria, name: 'Paso 2' },
          { component: Step3NotaAclaratoria, name: 'Paso 3' },
          { component: Step4NotaAclaratoria, name: 'Paso 4' },
          { component: Step5NotaAclaratoria, name: 'Paso 5' },
          { component: Step6NotaAclaratoria, name: 'Paso 6' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'notaAclaratoria') {
        stepsStore.setSteps([
          { component: Step1NotaAclaratoria, name: 'Paso 1' },
          { component: Step2NotaAclaratoria, name: 'Paso 2' },
          { component: Step3NotaAclaratoria, name: 'Paso 3' },
          { component: Step4NotaAclaratoria, name: 'Paso 4' },
          { component: Step5NotaAclaratoria, name: 'Paso 5' },
          { component: Step6NotaAclaratoria, name: 'Paso 6' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'controlPrenatal') {
        stepsStore.setSteps([
          { component: Step1ControlPrenatal, name: 'Paso 1' },
          { component: Step2ControlPrenatal, name: 'Paso 2' },
          { component: Step3ControlPrenatal, name: 'Paso 3' },
          { component: Step4ControlPrenatal, name: 'Paso 4' },
          { component: Step5ControlPrenatal, name: 'Paso 5' },
          { component: Step6ControlPrenatal, name: 'Paso 6' },
          { component: Step7ControlPrenatal, name: 'Paso 7' },
          { component: Step8ControlPrenatal, name: 'Paso 8' },
          { component: Step9ControlPrenatal, name: 'Paso 9' },
          { component: Step10ControlPrenatal, name: 'Paso 10' },
          { component: Step11ControlPrenatal, name: 'Paso 11' },
          { component: Step12ControlPrenatal, name: 'Paso 12' },
          { component: Step13ControlPrenatal, name: 'Paso 13' },
          { component: Step14ControlPrenatal, name: 'Paso 14' },
          { component: Step15ControlPrenatal, name: 'Paso 15' },
          { component: Step16ControlPrenatal, name: 'Paso 16' },
          { component: Step17ControlPrenatal, name: 'Paso 17' },
          { component: Step18ControlPrenatal, name: 'Paso 18' },
          { component: Step19ControlPrenatal, name: 'Paso 19' },
          { component: Step20ControlPrenatal, name: 'Paso 20' },
          { component: Step21ControlPrenatal, name: 'Paso 21' },
          { component: Step22ControlPrenatal, name: 'Paso 22' },
          { component: Step23ControlPrenatal, name: 'Paso 23' },
          { component: Step24ControlPrenatal, name: 'Paso 24' },
          { component: Step25ControlPrenatal, name: 'Paso 25' },
          { component: Step26ControlPrenatal, name: 'Paso 26' },
          { component: Step27ControlPrenatal, name: 'Paso 27' },
          { component: Step28ControlPrenatal, name: 'Paso 28' },
          { component: Step29ControlPrenatal, name: 'Paso 29' },
          { component: Step30ControlPrenatal, name: 'Paso 30' },
          { component: Step31ControlPrenatal, name: 'Paso 31' },
          { component: Step32ControlPrenatal, name: 'Paso 32' },
          { component: Step33ControlPrenatal, name: 'Paso 33' },
          { component: Step34ControlPrenatal, name: 'Paso 34' },
          { component: Step35ControlPrenatal, name: 'Paso 35' },
          { component: Step36ControlPrenatal, name: 'Paso 36' },
          { component: Step37ControlPrenatal, name: 'Paso 37' },
          { component: Step38ControlPrenatal, name: 'Paso 38' },
          { component: Step39ControlPrenatal, name: 'Paso 39' },
          { component: Step40ControlPrenatal, name: 'Paso 40' },
          { component: Step41ControlPrenatal, name: 'Paso 41' },
          { component: Step42ControlPrenatal, name: 'Paso 42' },
          { component: Step43ControlPrenatal, name: 'Paso 43' },
          { component: Step44ControlPrenatal, name: 'Paso 44' },
          { component: Step45ControlPrenatal, name: 'Paso 45' },
          { component: Step46ControlPrenatal, name: 'Paso 46' },
          { component: Step47ControlPrenatal, name: 'Paso 47' },
          { component: Step48ControlPrenatal, name: 'Paso 48' },
          { component: Step49ControlPrenatal, name: 'Paso 49' },
          { component: Step50ControlPrenatal, name: 'Paso 50' },
          { component: Step51ControlPrenatal, name: 'Paso 51' },
          { component: Step52ControlPrenatal, name: 'Paso 52' },
          { component: Step53ControlPrenatal, name: 'Paso 53' },
          { component: Step54ControlPrenatal, name: 'Paso 54' },
          { component: Step55ControlPrenatal, name: 'Paso 55' },
          { component: Step56ControlPrenatal, name: 'Paso 56' },
          { component: Step57ControlPrenatal, name: 'Paso 57' },
          { component: Step58ControlPrenatal, name: 'Paso 58' },
          { component: Step59ControlPrenatal, name: 'Paso 59' },
          { component: Step60ControlPrenatal, name: 'Paso 60' },
          { component: Step61ControlPrenatal, name: 'Paso 61' },
          { component: Step62ControlPrenatal, name: 'Paso 62' },
          { component: Step63ControlPrenatal, name: 'Paso 63' },
          { component: Step64ControlPrenatal, name: 'Paso 64' },
          { component: Step65ControlPrenatal, name: 'Paso 65' },
          { component: Step66ControlPrenatal, name: 'Paso 66' },
          { component: Step67ControlPrenatal, name: 'Paso 67' },
          { component: Step68ControlPrenatal, name: 'Paso 68' },
          { component: Step69ControlPrenatal, name: 'Paso 69' },
          { component: Step70ControlPrenatal, name: 'Paso 70' },
          { component: Step71ControlPrenatal, name: 'Paso 71' },
          { component: Step72ControlPrenatal, name: 'Paso 72' },
          { component: Step73ControlPrenatal, name: 'Paso 73' },
          { component: Step74ControlPrenatal, name: 'Paso 74' },
          { component: Step75ControlPrenatal, name: 'Paso 75' },
          { component: Step76ControlPrenatal, name: 'Paso 76' },
          { component: Step77ControlPrenatal, name: 'Paso 77' },
          { component: Step78ControlPrenatal, name: 'Paso 78' },
          { component: Step79ControlPrenatal, name: 'Paso 79' },
          { component: Step80ControlPrenatal, name: 'Paso 80' },
          { component: Step81ControlPrenatal, name: 'Paso 81' },
          { component: Step82ControlPrenatal, name: 'Paso 82' },
          { component: Step83ControlPrenatal, name: 'Paso 83' },
          { component: Step84ControlPrenatal, name: 'Paso 84' },
          { component: Step85ControlPrenatal, name: 'Paso 85' },
          { component: Step86ControlPrenatal, name: 'Paso 86' },
          { component: Step87ControlPrenatal, name: 'Paso 87' },
          { component: Step88ControlPrenatal, name: 'Paso 88' },
          { component: Step89ControlPrenatal, name: 'Paso 89' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'historiaOtologica') {
        stepsStore.setSteps([
          { component: Step1HistoriaOtologica, name: 'Paso 1' },
          { component: Step2HistoriaOtologica, name: 'Paso 2' },
          { component: Step3HistoriaOtologica, name: 'Paso 3' },
          { component: Step4HistoriaOtologica, name: 'Paso 4' },
          { component: Step5HistoriaOtologica, name: 'Paso 5' },
          { component: Step6HistoriaOtologica, name: 'Paso 6' },
          { component: Step7HistoriaOtologica, name: 'Paso 7' },
          { component: Step8HistoriaOtologica, name: 'Paso 8' },
          { component: Step9HistoriaOtologica, name: 'Paso 9' },
          { component: Step10HistoriaOtologica, name: 'Paso 10' },
          { component: Step11HistoriaOtologica, name: 'Paso 11' },
          { component: Step12HistoriaOtologica, name: 'Paso 12' },
          { component: Step13HistoriaOtologica, name: 'Paso 13' },
          { component: Step14HistoriaOtologica, name: 'Paso 14' },
          { component: Step15HistoriaOtologica, name: 'Paso 15' },
          { component: Step16HistoriaOtologica, name: 'Paso 16' },
          { component: Step17HistoriaOtologica, name: 'Paso 17' },
          { component: Step18HistoriaOtologica, name: 'Paso 18' },
          { component: Step19HistoriaOtologica, name: 'Paso 19' },
          { component: Step20HistoriaOtologica, name: 'Paso 20' },
          { component: Step21HistoriaOtologica, name: 'Paso 21' },
          { component: Step22HistoriaOtologica, name: 'Paso 22' },
          { component: Step23HistoriaOtologica, name: 'Paso 23' },
          { component: Step24HistoriaOtologica, name: 'Paso 24' },
          { component: Step25HistoriaOtologica, name: 'Paso 25' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'previoEspirometria') {
        stepsStore.setSteps([
          { component: Step1PrevioEspirometria, name: 'Paso 1' },
          { component: Step2PrevioEspirometria, name: 'Paso 2' },
          { component: Step3PrevioEspirometria, name: 'Paso 3' },
          { component: Step4PrevioEspirometria, name: 'Paso 4' },
          { component: Step5PrevioEspirometria, name: 'Paso 5' },
          { component: Step6PrevioEspirometria, name: 'Paso 6' },
          { component: Step7PrevioEspirometria, name: 'Paso 7' },
          { component: Step8PrevioEspirometria, name: 'Paso 8' },
          { component: Step9PrevioEspirometria, name: 'Paso 9' },
          { component: Step10PrevioEspirometria, name: 'Paso 10' },
          { component: Step11PrevioEspirometria, name: 'Paso 11' },
          { component: Step12PrevioEspirometria, name: 'Paso 12' },
          { component: Step13PrevioEspirometria, name: 'Paso 13' },
          { component: Step14PrevioEspirometria, name: 'Paso 14' },
          { component: Step15PrevioEspirometria, name: 'Paso 15' },
          { component: Step16PrevioEspirometria, name: 'Paso 16' },
          { component: Step17PrevioEspirometria, name: 'Paso 17' },
          { component: Step18PrevioEspirometria, name: 'Paso 18' },
          { component: Step19PrevioEspirometria, name: 'Paso 19' },
          { component: Step20PrevioEspirometria, name: 'Paso 20' },
          { component: Step21PrevioEspirometria, name: 'Paso 21' },
          { component: Step22PrevioEspirometria, name: 'Paso 22' },
          { component: Step23PrevioEspirometria, name: 'Paso 23' },
          { component: Step24PrevioEspirometria, name: 'Paso 24' },
          { component: Step25PrevioEspirometria, name: 'Paso 25' },
          { component: Step26PrevioEspirometria, name: 'Paso 26' },
          { component: Step27PrevioEspirometria, name: 'Paso 27' },
          { component: Step28PrevioEspirometria, name: 'Paso 28' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'receta') {
        stepsStore.setSteps([
          { component: Step1Receta, name: 'Paso 1' },
          { component: Step2Receta, name: 'Paso 2' },
          { component: Step3Receta, name: 'Paso 3' },
          { component: Step4Receta, name: 'Paso 4' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'constanciaAptitud') {
        stepsStore.setSteps([
          { component: Step1ConstanciaAptitud, name: 'Paso 1' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'entrevistaPsicologica') {
        stepsStore.setSteps([
          { component: Step1EntrevistaPsicologica, name: 'Paso 1' },
          { component: Step2EntrevistaPsicologica, name: 'Paso 2' },
          { component: Step3EntrevistaPsicologica, name: 'Paso 3' },
          { component: Step4EntrevistaPsicologica, name: 'Paso 4' },
          { component: Step5EntrevistaPsicologica, name: 'Paso 5' },
          { component: Step6EntrevistaPsicologica, name: 'Paso 6' },
          { component: Step7EntrevistaPsicologica, name: 'Paso 7' },
          { component: Step8EntrevistaPsicologica, name: 'Paso 8' },
          { component: Step9EntrevistaPsicologica, name: 'Paso 9' },
          { component: Step10EntrevistaPsicologica, name: 'Paso 10' },
          { component: Step11EntrevistaPsicologica, name: 'Paso 11' },
          { component: Step12EntrevistaPsicologica, name: 'Paso 12' },
          { component: Step13EntrevistaPsicologica, name: 'Paso 13' },
          { component: Step14EntrevistaPsicologica, name: 'Paso 14' },
          { component: Step15EntrevistaPsicologica, name: 'Paso 15' },
          { component: Step16EntrevistaPsicologica, name: 'Paso 16' },
          { component: Step17EntrevistaPsicologica, name: 'Paso 17' },
          { component: Step18EntrevistaPsicologica, name: 'Paso 18' },
          { component: Step19EntrevistaPsicologica, name: 'Paso 19' },
          { component: Step20EntrevistaPsicologica, name: 'Paso 20' },
          { component: Step21EntrevistaPsicologica, name: 'Paso 21' },
          { component: Step22EntrevistaPsicologica, name: 'Paso 22' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'trastornosEstadoAnimo') {
        aplicarPasosTrastornosEstadoAnimo(false);
      } else if (documentos.currentTypeOfDocument === 'cuestionarioProdromalBreve') {
        stepsStore.setSteps([
          { component: Step1CuestionarioProdromalBreve, name: 'Paso 1' },
          { component: Step2CuestionarioProdromalBreve, name: 'Paso 2' },
          { component: Step3CuestionarioProdromalBreve, name: 'Paso 3' },
          { component: Step4CuestionarioProdromalBreve, name: 'Paso 4' },
          { component: Step5CuestionarioProdromalBreve, name: 'Paso 5' },
          { component: Step6CuestionarioProdromalBreve, name: 'Paso 6' },
          { component: Step7CuestionarioProdromalBreve, name: 'Paso 7' },
          { component: Step8CuestionarioProdromalBreve, name: 'Paso 8' },
          { component: Step9CuestionarioProdromalBreve, name: 'Paso 9' },
          { component: Step10CuestionarioProdromalBreve, name: 'Paso 10' },
          { component: Step11CuestionarioProdromalBreve, name: 'Paso 11' },
          { component: Step12CuestionarioProdromalBreve, name: 'Paso 12' },
          { component: Step13CuestionarioProdromalBreve, name: 'Paso 13' },
          { component: Step14CuestionarioProdromalBreve, name: 'Paso 14' },
          { component: Step15CuestionarioProdromalBreve, name: 'Paso 15' },
          { component: Step16CuestionarioProdromalBreve, name: 'Paso 16' },
          { component: Step17CuestionarioProdromalBreve, name: 'Paso 17' },
          { component: Step18CuestionarioProdromalBreve, name: 'Paso 18' },
          { component: Step19CuestionarioProdromalBreve, name: 'Paso 19' },
          { component: Step20CuestionarioProdromalBreve, name: 'Paso 20' },
          { component: Step21CuestionarioProdromalBreve, name: 'Paso 21' },
          { component: Step22CuestionarioProdromalBreve, name: 'Paso 22' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'trastornoLimitePersonalidad') {
        stepsStore.setSteps([
          { component: Step1TrastornoLimitePersonalidad, name: 'Paso 1' },
          { component: Step2TrastornoLimitePersonalidad, name: 'Paso 2' },
          { component: Step3TrastornoLimitePersonalidad, name: 'Paso 3' },
          { component: Step4TrastornoLimitePersonalidad, name: 'Paso 4' },
          { component: Step5TrastornoLimitePersonalidad, name: 'Paso 5' },
          { component: Step6TrastornoLimitePersonalidad, name: 'Paso 6' },
          { component: Step7TrastornoLimitePersonalidad, name: 'Paso 7' },
          { component: Step8TrastornoLimitePersonalidad, name: 'Paso 8' },
          { component: Step9TrastornoLimitePersonalidad, name: 'Paso 9' },
          { component: Step10TrastornoLimitePersonalidad, name: 'Paso 10' },
          { component: Step11TrastornoLimitePersonalidad, name: 'Paso 11' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'eventoSeguimientoCardiometabolico') {
        stepsStore.setSteps([
          { component: Step1EventoSeguimientoCardiometabolico, name: 'Fecha y motivo' },
          { component: Step2EventoSeguimientoCardiometabolico, name: 'Diagnósticos activos' },
          { component: Step3EventoSeguimientoCardiometabolico, name: 'Somatometría' },
          { component: Step4EventoSeguimientoCardiometabolico, name: 'Signos vitales' },
          { component: Step5EventoSeguimientoCardiometabolico, name: 'Laboratorio' },
          { component: Step6EventoSeguimientoCardiometabolico, name: 'Tratamiento y cambios' },
          { component: Step7EventoSeguimientoCardiometabolico, name: 'Adherencia y síntomas' },
          { component: Step8EventoSeguimientoCardiometabolico, name: 'Estado por condición' },
          { component: Step9EventoSeguimientoCardiometabolico, name: 'Riesgos y próxima cita' },
        ]);
      } else if (documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico') {
        stepsStore.setSteps([
          { component: Step1InformeLongitudinalCardiometabolico, name: 'Periodo y fuentes' },
          { component: Step2InformeLongitudinalCardiometabolico, name: 'Riesgo e interpretación' },
          { component: Step3InformeLongitudinalCardiometabolico, name: 'Trayectoria y seguimiento' },
        ]);
      } else {
        console.error(`Tipo de documento no reconocido: ${documentos.currentTypeOfDocument}`);
      }

      // Verificar si hay un query param para saltar a un paso específico (ej: desde crear nota aclaratoria)
      const skipToStep = route.query.skipToStep;
      if (skipToStep) {
        const stepNumber = parseInt(skipToStep, 10);
        if (stepNumber > 0 && stepNumber <= stepsStore.steps.length) {
          if (documentos.currentTypeOfDocument === 'notaAclaratoria') {
            bootstrapNotaAclaratoriaNueva({
              documentoOrigenTipo: route.query.documentoOrigenTipo,
              documentoOrigenId: route.query.documentoOrigenId,
            });
          }
          stepsStore.currentStep = stepNumber;
          console.log(`⏭️ Saltando al paso ${stepNumber} (skipToStep desde query params)`);
          return; // No continuar con el check de documento existente
        }
      }

      // Verifica si se está editando (puede que currentDocument aún no esté cargado)
      if (documentos.currentDocument) {
        // Si se está editando, mostrar mensaje final
        stepsStore.currentStep = stepsStore.steps.length + 1;
      }
    });

    // Watch para detectar cuando currentDocument cambia (carga asíncrona)
    // Esto es necesario porque fetchDocumentById es asíncrono y puede no estar listo en onMounted
    watch(
      () => documentos.currentDocument,
      (newDocument, oldDocument) => {
        const documentoId = route.params.idDocumento;
        const skipToStep = route.query.skipToStep;

        if (
          newDocument &&
          stepsStore.steps.length > 0 &&
          documentoId &&
          !oldDocument &&
          !skipToStep
        ) {
          stepsStore.currentStep = stepsStore.steps.length + 1;
        }
      },
      { immediate: false },
    );

    // Manejo de eventos de teclado
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;

      // Permitir navegación en campos de entrada
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return; // Salir si un campo de texto está enfocado
      }

      // ¿Cambiar Enter y Backspace por ArrowRight y ArrowLeft?

      // Manejar Enter y Backspace
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevenir comportamiento por defecto de Enter
        stepsStore.nextStep();
      } else if (event.key === 'Backspace') {
        event.preventDefault(); // Prevenir comportamiento por defecto de Backspace
        stepsStore.previousStep();
      }
    };

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });


    // Función para limpiar valores undefined
    function limpiarValoresUndefined(obj) {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
      );
    }

    /** Payload ESC: sin campos deprecados; estado por condición bajo estadoCondiciones. */
    function sanitizarPayloadEventoSeguimientoCardiometabolico(raw) {
      const o = { ...raw };
      delete o.evaluacionClinica;
      delete o.plan;
      delete o.estadoCondicionMetabolica;
      if (Array.isArray(o.tratamientoActual)) {
        const filas = o.tratamientoActual
          .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const out = {};
            for (const k of ['medicamento', 'dosis', 'frecuencia', 'motivoUso']) {
              const v = String(row[k] ?? '').trim();
              if (v) out[k] = v;
            }
            return Object.keys(out).length ? out : null;
          })
          .filter(Boolean);
        if (filas.length) o.tratamientoActual = filas;
        else delete o.tratamientoActual;
      }
      if (o.estadoCondiciones && typeof o.estadoCondiciones === 'object') {
        const src = o.estadoCondiciones;
        const out = {};
        for (const k of ['hipertensionArterial', 'diabetesMellitusTipo2', 'dislipidemia']) {
          const c = src[k]?.control;
          if (c) out[k] = { control: c };
        }
        const ob = src.obesidad;
        if (ob?.grado) {
          out.obesidad = { grado: ob.grado };
        }
        if (Object.keys(out).length) o.estadoCondiciones = out;
        else delete o.estadoCondiciones;
      }
      sincronizarEstadoControlAutomatico(o);
      limpiarControlSinDiagnostico(o);
      return limpiarValoresUndefined(o);
    }

    // Función para convertir todas las fechas al formato ISO
    function convertirFechasAISO(obj) {
      const result = { ...obj }; // Clonar el objeto para evitar modificar el original
      for (const key in result) {
        if (result.hasOwnProperty(key)) {
          const value = result[key];
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            // Si el valor es una fecha en formato YYYY-MM-DD, conviértelo a ISO
            result[key] = new Date(value).toISOString();
          }
        }
      }
      return result;
    }

    /** Fechas en `eventosConcentrados` / `seguimientosProgramadosConcentrados` (objetos anidados). */
    function convertirFechasInformeLongitudinalCardiometabolico(raw) {
      const o = convertirFechasAISO({ ...raw });
      if (Array.isArray(o.eventosConcentrados)) {
        o.eventosConcentrados = o.eventosConcentrados.map((e) =>
          e && typeof e === 'object' ? convertirFechasAISO({ ...e }) : e,
        );
      }
      if (Array.isArray(o.seguimientosProgramadosConcentrados)) {
        o.seguimientosProgramadosConcentrados = o.seguimientosProgramadosConcentrados.map((e) =>
          e && typeof e === 'object' ? convertirFechasAISO({ ...e }) : e,
        );
      }
      return o;
    }

    const user = ref(null);
    try {
      const raw = localStorage.getItem('user');
      user.value = raw ? JSON.parse(raw) : null;
    } catch {
      user.value = null;
    }
    // console.log('Usuario:', user.value);

    // Variables para el modal de campos faltantes
    const showCamposFaltantesModal = ref(false);
    const camposFaltantes = ref([]);

    const handleSubmit = async () => {
      let datosLimpios;

      // Limpiar datos del formulario según el tipo de documento
      if (documentos.currentTypeOfDocument === 'antidoping') {
        datosLimpios = limpiarValoresUndefined(formData.formDataAntidoping);
      } else if (documentos.currentTypeOfDocument === 'aptitud') {
        datosLimpios = limpiarValoresUndefined(formData.formDataAptitud);
      } else if (documentos.currentTypeOfDocument === 'audiometria') {
        datosLimpios = limpiarValoresUndefined(formData.formDataAudiometria);
      } else if (documentos.currentTypeOfDocument === 'certificado') {
        datosLimpios = limpiarValoresUndefined(formData.formDataCertificado);
      } else if (documentos.currentTypeOfDocument === 'certificadoExpedito') {
        datosLimpios = limpiarValoresUndefined(formData.formDataCertificadoExpedito);
      } else if (documentos.currentTypeOfDocument === 'documento Externo') {
        datosLimpios = limpiarValoresUndefined(formData.formDataDocumentoExterno);
      } else if (documentos.currentTypeOfDocument === 'examenVista') {
        datosLimpios = limpiarValoresUndefined(formData.formDataExamenVista);
      } else if (documentos.currentTypeOfDocument === 'exploracionFisica') {
        datosLimpios = limpiarValoresUndefined(formData.formDataExploracionFisica);
      } else if (documentos.currentTypeOfDocument === 'historiaClinica') {
        datosLimpios = limpiarValoresUndefined(formData.formDataHistoriaClinica);
      } else if (documentos.currentTypeOfDocument === 'notaMedica') {
        datosLimpios = limpiarValoresUndefined(formData.formDataNotaMedica);
      } else if (documentos.currentTypeOfDocument === 'notaAclaratoria') {
        datosLimpios = limpiarValoresUndefined(formData.formDataNotaAclaratoria);
      } else if (documentos.currentTypeOfDocument === 'controlPrenatal') {
        datosLimpios = limpiarValoresUndefined(formData.formDataControlPrenatal);
      } else if (documentos.currentTypeOfDocument === 'historiaOtologica') {
        datosLimpios = limpiarValoresUndefined(formData.formDataHistoriaOtologica);
      } else if (documentos.currentTypeOfDocument === 'previoEspirometria') {
        datosLimpios = limpiarValoresUndefined(formData.formDataPrevioEspirometria);
      } else if (documentos.currentTypeOfDocument === 'receta') {
        datosLimpios = limpiarValoresUndefined(formData.formDataReceta);
      } else if (documentos.currentTypeOfDocument === 'constanciaAptitud') {
        datosLimpios = limpiarValoresUndefined(formData.formDataConstanciaAptitud);
      } else if (documentos.currentTypeOfDocument === 'entrevistaPsicologica') {
        datosLimpios = limpiarValoresUndefined(formData.formDataEntrevistaPsicologica);
      } else if (documentos.currentTypeOfDocument === 'trastornosEstadoAnimo') {
        datosLimpios = limpiarValoresUndefined(formData.formDataTrastornosEstadoAnimo);
      } else if (documentos.currentTypeOfDocument === 'cuestionarioProdromalBreve') {
        datosLimpios = limpiarValoresUndefined(formData.formDataCuestionarioProdromalBreve);
      } else if (documentos.currentTypeOfDocument === 'trastornoLimitePersonalidad') {
        datosLimpios = limpiarValoresUndefined(formData.formDataTrastornoLimitePersonalidad);
      } else if (documentos.currentTypeOfDocument === 'eventoSeguimientoCardiometabolico') {
        datosLimpios = sanitizarPayloadEventoSeguimientoCardiometabolico(
          formData.formDataEventoSeguimientoCardiometabolico,
        );
        if (tieneControlHuerfano(datosLimpios)) {
          toast.open({
            message:
              'Hay valoraciones de control sin diagnóstico activo correspondiente. Revise el paso «Estado por condición».',
            type: 'error',
          });
          return;
        }
      } else if (documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico') {
        datosLimpios = limpiarValoresUndefined(formData.formDataInformeLongitudinalCardiometabolico);
      } else {
        console.error(`Tipo de documento no reconocido: ${documentos.currentTypeOfDocument}`);
        return; // Salir si el tipo de documento no es válido
      }

      // VALIDACIÓN CIE-10: Verificar duplicidades para notaMedica
      if (documentos.currentTypeOfDocument === 'notaMedica') {
        const cie10Validation = validateCIE10Duplicates({
          codigoCIE10Principal: formData.formDataNotaMedica.codigoCIE10Principal,
          codigosCIE10Complementarios: formData.formDataNotaMedica.codigosCIE10Complementarios,
          codigoCIEDiagnostico2: formData.formDataNotaMedica.codigoCIEDiagnostico2,
          codigoCIEDiagnostico3: formData.formDataNotaMedica.codigoCIEDiagnostico3
        });
        
        if (!cie10Validation.ok && cie10Validation.issues.length > 0) {
          // Mostrar toast con el primer issue encontrado
          const message = generateBlockingToastMessage(cie10Validation.issues[0]);
          toast.open({ 
            message: message, 
            type: 'error' 
          });
          return; // No continuar con el envío
        }

        // VALIDACIÓN CIE-10: Códigos deben tener exactamente 4 caracteres
        const cie4CharsNota = validarNotaMedicaCIEExact4Chars(formData.formDataNotaMedica, showSiresUI.value);
        if (!cie4CharsNota.valido) {
          if (cie4CharsNota.paso) stepsStore.goToStep(cie4CharsNota.paso);
          toast.open({
            message: cie4CharsNota.mensaje,
            type: 'error'
          });
          return;
        }

        // DIAGNOSTICO_SIS: primeraVez -1, catálogo, LETRA MT/CP, sexo/edad diag2/diag3
        const trabajadorNm = trabajadores.currentTrabajador;
        let medicoFirmante = null;
        let enfermeraFirmante = null;
        if (user.value?._id) {
          const normalizeFirmanteApi = (body) => {
            if (!body) return null;
            if (body._id) return body;
            if (body.data && body.data._id) return body.data;
            return null;
          };
          try {
            const { data: medicoBody } = await MedicoFirmanteAPI.getMedicoFirmanteByUserId(user.value._id);
            medicoFirmante = normalizeFirmanteApi(medicoBody);
          } catch {
            medicoFirmante = null;
          }
          if (!medicoFirmante) {
            try {
              const { data: enfBody } = await EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(user.value._id);
              enfermeraFirmante = normalizeFirmanteApi(enfBody);
            } catch {
              enfermeraFirmante = null;
            }
          }
        }
        const fechaNotaMedicaSis = formData.formDataNotaMedica.fechaNotaMedica
          ? new Date(formData.formDataNotaMedica.fechaNotaMedica)
          : new Date();
        try {
          const sis = await validateNotaMedicaDiagnosticos2Y3({
            formData: formData.formDataNotaMedica,
            trabajadorSexo: trabajadorNm?.sexo || '',
            trabajadorFechaNacimiento: trabajadorNm?.fechaNacimiento
              ? new Date(trabajadorNm.fechaNacimiento)
              : fechaNotaMedicaSis,
            fechaNotaMedica: fechaNotaMedicaSis,
            medicoFirmante,
            enfermeraFirmante,
            showSiresUI: showSiresUI.value,
          });
          if (!sis.ok) {
            if (sis.paso) stepsStore.goToStep(sis.paso);
            toast.open({ message: sis.messageToast || 'Validación de diagnósticos no superada.', type: 'error' });
            return;
          }
        } catch (err) {
          console.error('validateNotaMedicaDiagnosticos2Y3:', err);
        }

        // VALIDACIÓN PRE-SUBMIT NOTA MÉDICA: fechas, edad, sistólica/diastólica (CEX NOM-024)
        const validacionNotaMedica = validarNotaMedicaPreSubmit(
          formData.formDataNotaMedica,
          trabajadores.currentTrabajador,
          showSiresUI.value
        );
        if (!validacionNotaMedica.valido) {
          if (validacionNotaMedica.paso) stepsStore.goToStep(validacionNotaMedica.paso);
          toast.open({
            message: validacionNotaMedica.mensaje,
            type: 'error'
          });
          return;
        }
      }

      // VALIDACIÓN PREVIA: Verificar campos requeridos antes de enviar al backend
      // Incluye codigoCIE10Principal que es obligatorio para todos los regímenes
      const validacion = validarCamposRequeridos(
        documentos.currentTypeOfDocument, 
        datosLimpios,
        { cie10Required: cie10Required.value }
      );
      
      if (!validacion.esValido) {
        // Mostrar modal con campos faltantes específicos
        camposFaltantes.value = validacion.camposFaltantes;
        showCamposFaltantesModal.value = true;
        return; // No continuar con el envío
      }

      // VALIDACIÓN ESPECÍFICA PARA CONSTANCIA DE APTITUD: Verificar que exista una Aptitud al Puesto con una de las 3 opciones de "si aptitud"
      if (documentos.currentTypeOfDocument === 'constanciaAptitud') {
        try {
          const response = await DocumentosAPI.getAptitudes(trabajadores.currentTrabajadorId);
          const aptitudes = response.data || [];
          
          // Opciones válidas de "si aptitud"
          const opcionesAptitudValidas = [
            'Apto Sin Restricciones',
            'Apto Con Precaución',
            'Apto Con Restricciones'
          ];
          
          // Verificar que exista al menos una aptitud con una de las opciones válidas
          const existeAptitudValida = aptitudes.some(aptitud => 
            aptitud.aptitudPuesto && opcionesAptitudValidas.includes(aptitud.aptitudPuesto)
          );
          
          if (!existeAptitudValida) {
            // Determinar el mensaje según el sexo del trabajador
            const sexo = trabajadores.currentTrabajador?.sexo || '';
            const mensaje = sexo === 'Femenino' 
              ? 'Solo se puede crear esta constancia si la trabajadora es Apta'
              : 'Solo se puede crear esta constancia si el trabajador es Apto';
            
            toast.open({ 
              message: mensaje, 
              type: 'error' 
            });
            return; // No continuar con el envío
          }
        } catch (error) {
          console.error('Error al validar aptitudes:', error);
          toast.open({ 
            message: 'Error al validar las aptitudes. Por favor, intente nuevamente.', 
            type: 'error' 
          });
          return; // No continuar con el envío
        }
      }

      // Convertir todas las fechas en los datos al formato ISO
      datosLimpios =
        documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico'
          ? convertirFechasInformeLongitudinalCardiometabolico(datosLimpios)
          : convertirFechasAISO(datosLimpios);

      if (documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico') {
        refrescarEventosConcentradosEnInforme(
          datosLimpios,
          eventosCmDesdeDocumentsByYear(
            documentos.documentsByYear,
            trabajadores.currentTrabajadorId,
          ),
        );
        aplicarIteracionDosAlFormulario(datosLimpios, {
          preservarJuicioClinicoRiesgo: true,
          coherenciaCtx: coherenciaCtxDesdeSexo(trabajadores.currentTrabajador?.sexo),
        });
        datosLimpios = convertirFechasInformeLongitudinalCardiometabolico(datosLimpios);
      }

      const uid = userStore.user?._id;
      if (uid) {
        datosLimpios = normalizarCamposAuditoriaPayload(datosLimpios, uid);
        if (!datosLimpios._id && !datosLimpios.createdBy) {
          datosLimpios.createdBy = uid;
        }
      }

      // console.log('Datos limpios para enviar al backend:', datosLimpios);

      try {
        let response;
        if (datosLimpios._id) {
          // console.log(datosLimpios)
          
          // Actualizar el documento
          response = await documentos.updateDocument(
            documentos.currentTypeOfDocument,
            trabajadores.currentTrabajadorId,
            datosLimpios._id,
            datosLimpios
          );
          toast.open({ message: 'Documento actualizado exitosamente.' });
        } else {
          // Crear un nuevo documento - aplicar gate de consentimiento diario
          const createAction = async () => {
            return await documentos.createDocument(
              documentos.currentTypeOfDocument,
              trabajadores.currentTrabajadorId,
              datosLimpios
            );
          };

          // Envolver con runWithDailyConsent para manejar consentimiento automáticamente
          response = await runWithDailyConsent(
            createAction,
            trabajadores.currentTrabajadorId,
            formatNombreCompleto(trabajadores.currentTrabajador),
            trabajadores.currentTrabajador?.sexo
          );

          // Si el usuario canceló el modal, no continuar
          if (!response) {
            return;
          }

          toast.open({ message: 'Documento creado exitosamente.' });
        }

        if (!response || !response._id) {
          throw new Error('La respuesta del backend no contiene un ID válido');
        }

        const documentId = response._id;

        // Llamada al backend para generar el informe
        const apiEndpoint = `${import.meta.env.VITE_API_URL}/informes/${documentos.currentTypeOfDocument}/${empresas.currentEmpresaId}/${trabajadores.currentTrabajadorId}/${documentId}/${user.value._id}`;

        let informeResponse;
        if (documentos.currentTypeOfDocument === 'audiometria') {
          // Para audiometría, obtener la gráfica del store
          const graficaBase64 = formData.formDataAudiometria.graficaAudiometria;
          
          if (graficaBase64) {
            // Usar POST para enviar la gráfica en el body
            informeResponse = await axios.post(apiEndpoint, { grafica: graficaBase64 });
          } else {
            // Usar GET si no hay gráfica
            informeResponse = await axios.get(apiEndpoint);
          }
        } else {
          informeResponse = await axios.get(apiEndpoint);
        }
        // console.log("Respuesta del backend para el informe:", informeResponse.data);

      } catch (error) {
        console.error('Error en el proceso de creación o generación del informe:', error);
        
        // Mejorar mensajes de error específicos
        let mensajeError = 'Hubo un error, por favor intente nuevamente.';
        
        // Verificar si es un error de axios
        if (error.response) {
          // Log completo del error para debugging (usando JSON.stringify para ver objetos completos)
          console.error('=== Detalles del error (respuesta del backend) ===');
          console.error('Status:', error.response.status);
          console.error('Status Text:', error.response.statusText);
          console.error('Data completo:', JSON.stringify(error.response.data, null, 2));
          if (error.response.data?.message) {
            console.error('Message:', error.response.data.message);
          }
          if (error.response.data?.code) {
            console.error('Code:', error.response.data.code);
          }
          if (error.response.data?.ruleId) {
            console.error('Rule ID:', error.response.data.ruleId);
          }
          if (error.response.data?.details) {
            console.error('Details:', JSON.stringify(error.response.data.details, null, 2));
          }
          console.error('================================================');
          
          // Si es un error regulatorio, el interceptor ya mostró el toast
          // Solo mostrar toast adicional si no es un error regulatorio
          if (error.response.data?.errorCode) {
            // Error regulatorio ya manejado por el interceptor, no duplicar toast
            // El mensaje ya fue mostrado por el interceptor, solo log para debugging
            console.log('Error regulatorio manejado por interceptor:', error.response.data);
          } else {
            // Priorizar mensaje del response si existe
            if (error.response.data && error.response.data.message) {
              mensajeError = error.response.data.message;
              
              // Si hay detalles, agregarlos al mensaje para mejor información
              if (error.response.data.details && Array.isArray(error.response.data.details) && error.response.data.details.length > 0) {
                const detallesTexto = error.response.data.details.map((detail) => {
                  const campo = detail.field || 'campo desconocido';
                  const cie10 = detail.cie10 || 'N/A';
                  const razon = detail.reason || 'razón desconocida';
                  return `${campo}: ${cie10} - ${razon}`;
                }).join('; ');
                
                mensajeError += ` (${detallesTexto})`;
              }
            } else {
              // Mensajes específicos según el tipo de error si no hay mensaje personalizado
              if (error.response.status === 400) {
                mensajeError = 'Los datos enviados no son válidos. Verifique que todos los campos estén completos correctamente.';
              } else if (error.response.status === 404) {
                mensajeError = 'No se encontró el recurso solicitado. Verifique que el trabajador y empresa existan.';
              } else if (error.response.status === 403) {
                // Errores 403 ya manejados por el interceptor si son regulatorios
                mensajeError = 'No tienes permisos para realizar esta acción.';
              } else if (error.response.status === 500) {
                mensajeError = 'Error interno del servidor. Por favor, contacte al administrador si el problema persiste.';
              }
            }
            
            // Mostrar toast solo si no es un error regulatorio
            toast.open({ message: mensajeError, type: 'error' });
          }
        } else if (error.code === 'NETWORK_ERROR') {
          mensajeError = 'Error de conexión. Verifique su conexión a internet e intente nuevamente.';
          toast.open({ message: mensajeError, type: 'error' });
        }
        return;
      }

      const tipoDocEnviado = documentos.currentTypeOfDocument;
      const esCreacionNotaAclaratoria =
        tipoDocEnviado === 'notaAclaratoria' && !datosLimpios._id;

      // Reiniciar el estado del formulario después de enviar
      formData.resetFormData();

      documentos.currentTypeOfDocument = null;

      if (esCreacionNotaAclaratoria) {
        router.push({
          name: 'expediente-medico',
          params: {
            idEmpresa: empresas.currentEmpresaId,
            idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
            idTrabajador: trabajadores.currentTrabajadorId,
          },
        });
        return;
      }

      router.back();
    };

    return {
      stepsStore,
      handleSubmit,
      progressPercentage,
      currentStepDisplay,
      showCamposFaltantesModal,
      camposFaltantes,
      documentos,
      disableEdit,
      isFinalizado,
      isAnulado,
      isMX,
      crearNotaAclaratoria,
      notaAclaratoriaEnabled,
      regulatoryPolicy,
      showConsentModal,
      modalTrabajadorId,
      modalTrabajadorNombre,
      modalTrabajadorSexo,
      handleConsentRegistered,
      handleConsentCancel,
      documentAuditInfo,
      formatUsername,
      dynamicStepComponentKey,
    };
  },
};
</script>

<template>
  <!-- Modal para campos faltantes -->
  <Transition appear name="fade">
    <ModalFaltanCampos v-if="stepsStore.showMissingFieldsModal" 
      @close="stepsStore.showMissingFieldsModal = false"/>
  </Transition>

  <!-- Modal para campos requeridos faltantes -->
  <Transition appear name="fade">
    <ModalCamposFaltantes 
      v-if="showCamposFaltantesModal" 
      :campos-faltantes="camposFaltantes"
      :tipo-documento="documentos.currentTypeOfDocument"
      @close="showCamposFaltantesModal = false"/>
  </Transition>

  <!-- Modal de Consentimiento Diario -->
  <DailyConsentModal
    v-if="showConsentModal"
    :trabajador-id="modalTrabajadorId"
    :trabajador-nombre="modalTrabajadorNombre"
    :trabajador-sexo="modalTrabajadorSexo"
    :open="showConsentModal"
    @registered="handleConsentRegistered"
    @cancel="handleConsentCancel"
  />

  <div
    class="border-shadow w-full col-span-1 2xl:col-span-9 text-left rounded-lg p-7 2xl:p-7 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-md mx-auto">

    <!-- Barra de progreso mejorada -->
    <div class="relative w-full h-2 mb-4 bg-gray-200 rounded-full overflow-hidden">
      <div class="progress-bar absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-300"
        :style="{
          width:
            (stepsStore.steps.length
              ? ((stepsStore.currentStep - 1) / stepsStore.steps.length) * 100
              : 0) + '%',
        }"></div>
    </div>

    <!-- Indicador sutil de progreso -->
    <div class="flex justify-between items-center mb-4 text-xs text-gray-500">
      <span>Paso {{ currentStepDisplay }} de {{ stepsStore.steps.length }}</span>
      <span class="font-medium text-emerald-600">{{ progressPercentage }}% completado</span>
    </div>

    <!-- Formulario dinámico -->
    <transition name="fade-slide" mode="out-in">
      <div v-if="stepsStore.currentStep <= stepsStore.steps.length && stepsStore.steps.length > 0"
        :key="dynamicStepComponentKey"
        :class="{ 'pointer-events-none opacity-80 select-none': disableEdit }"
      >
        <component :is="stepsStore.steps[stepsStore.currentStep - 1].component" />
      </div>
    </transition>

    <!-- Navegación entre pasos -->
    <div v-if="stepsStore.currentStep <= stepsStore.steps.length && stepsStore.steps.length > 0"
      class="flex flex-col mt-6">
      <div class="flex justify-between">
        <button :class="{ invisible: stepsStore.currentStep === 1 }" @click="stepsStore.previousStep"
          class="px-4 py-2 text-xs md:text-base text-white rounded-lg bg-gray-500 hover:bg-gray-600 transition-all duration-300">
          &lt; Anterior
        </button>
  
        <button :class="{ invisible: stepsStore.currentStep > stepsStore.steps.length }" @click="stepsStore.nextStep"
          class="px-4 py-2 text-xs md:text-base text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
          Siguiente &gt;
        </button>
      </div>

      <button v-if="!disableEdit" @click="handleSubmit"
        class="text-xs md:text-sm mt-6 text-gray-500 hover:text-emerald-600 transition-colors"
      >
        Guardar cambios
      </button>
      <div v-else class="text-xs md:text-sm mt-6 font-medium flex items-center justify-center gap-2"
           :class="isAnulado ? 'text-rose-600' : 'text-amber-600'">
        <i class="fas fa-lock"></i>
        <span v-if="isAnulado">Documento anulado - Edición bloqueada</span>
        <span v-else>Documento finalizado - Edición bloqueada</span>
      </div>
    </div>

    <!-- Mensaje final -->
    <div v-else>
      <transition name="fade-slide" mode="out-in">
        <div>
          <p class="text-center text-2xl font-bold mb-2 text-emerald-600">¡Completado!</p>
          <p class="text-center text-sm font-medium text-gray-500 mb-6">
            <span v-if="disableEdit && isAnulado">
              Este documento está anulado y no se pueden guardar nuevos cambios.
            </span>
            <span v-else-if="disableEdit">
              Este documento está finalizado y no se pueden guardar nuevos cambios.
            </span>
            <span v-else>
              Todos los pasos se han completado correctamente. Puedes guardar el PDF o revisar nuevamente.
            </span>
          </p>

          <!-- Botón para crear nota aclaratoria (solo SIRES_NOM024 y documento finalizado/anulado) -->
          <div v-if="notaAclaratoriaEnabled && (isFinalizado || isAnulado)" class="flex justify-center mb-6">
            <button 
              @click="crearNotaAclaratoria"
              class="w-full sm:w-3/5 md:w-2/3 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:text-amber-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              <i class="fas fa-file-signature"></i>
              Crear nota aclaratoria
            </button>
          </div>

          <div v-if="documentos.currentDocument && documentAuditInfo"
            class="-my-2 pt-3 pb-4 border-t border-gray-200 text-xs text-gray-400 space-y-1">
            <p v-if="documentAuditInfo.createdByUsername">
              Creado por: <span class="font-medium text-gray-500">{{ formatUsername(documentAuditInfo.createdByUsername, documentAuditInfo.createdById) }}</span>
            </p>
            <p v-if="documentAuditInfo.updatedByUsername && !documentAuditInfo.isSameUser">
              Última actualización: <span class="font-medium text-gray-500">{{ formatUsername(documentAuditInfo.updatedByUsername, documentAuditInfo.updatedById) }}</span>
            </p>
          </div>
          <div :class="['flex justify-between', documentAuditInfo && 'mt-4']">
            <button @click="stepsStore.previousStep"
              class="px-4 py-2 text-xs md:text-base text-white rounded-lg bg-gray-500 hover:bg-gray-600 transition-all duration-300 shadow-md">
              &lt; Anterior
            </button>
            <button v-if="!disableEdit" @click="handleSubmit"
              class="px-4 py-2 text-xs md:text-base rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-transform duration-200 ease-in-out hover:scale-110 glow-animation focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
              Crear PDF
            </button>
            <div v-else class="px-4 py-2 text-xs md:text-base rounded-lg bg-gray-100 text-gray-400 font-semibold flex items-center gap-2">
              <i class="fas fa-lock"></i>
              Solo Lectura
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease, filter 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-5%);
  filter: blur(10px);
}

.fade-slide-enter-to {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0);
}

.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(10%);
  filter: blur(10px);
}

.progress-bar {
  transition: all 0.3s ease-in-out;
}

button {
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

/* Estilos específicos para los botones verdes al ser presionados */
.bg-emerald-600:active {
  transform: translateY(2px) scale(0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  background-color: #059669;
  /* Tono más oscuro de verde */
}

/* Estilos específicos para los botones grises al ser presionados */
.bg-gray-500:active {
  transform: translateY(2px) scale(0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  background-color: #4b5563;
  /* Mantiene un tono de gris similar al hover */
}

.glow-animation {
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.glow-animation::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, rgba(56, 248, 158, 0.1), rgba(56, 248, 158, 0.3));
  opacity: 0.8;
  transform: rotate(0deg);
  z-index: -1;
  animation: glow 3s linear infinite;
  border-radius: inherit;
  /* Asegura que siga la forma del botón */
}

@keyframes glow {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
