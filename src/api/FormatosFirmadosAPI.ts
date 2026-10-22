import api from '@/lib/axios';
import type { FirmaCapturada } from '@/helpers/capturaFirma';
import type {
  FormatoFirmadoEnFecha,
  ResumenFormatoFirma,
  TextoFormatoFirma,
  TipoFormatoFirma,
} from '@/types/formatoFirma';

export interface ConfiguracionFirmaEnPantalla {
  firmaEnPantallaHabilitada: boolean;
}

export interface FormatoFirmadoCreado {
  _id: string;
  tipoFormato: TipoFormatoFirma;
  versionTexto: string;
  firmadoEn: string;
  folio: string;
  hashRegistro: string;
  /** El PDF tal como quedó en el expediente. */
  documentoExterno: any;
}

export default {
  /** Los formatos para firma, en el orden del modal, y si ya se pueden usar. */
  listarFormatos(): Promise<{ data: ResumenFormatoFirma[] }> {
    return api.get('/formatos-firmados/textos');
  },

  /** Formatos ya firmados en pantalla (vigentes) de un trabajador con esa fecha (`yyyy-mm-dd`). */
  firmadosPorFecha(trabajadorId: string, fecha: string): Promise<{ data: FormatoFirmadoEnFecha[] }> {
    return api.get(`/formatos-firmados/trabajador/${trabajadorId}`, { params: { fecha } });
  },

  getTexto(tipoFormato: TipoFormatoFirma): Promise<{ data: TextoFormatoFirma }> {
    return api.get(`/formatos-firmados/textos/${tipoFormato}`);
  },

  getConfiguracion(): Promise<{ data: ConfiguracionFirmaEnPantalla }> {
    return api.get('/formatos-firmados/configuracion');
  },

  actualizarConfiguracion(
    cambios: ConfiguracionFirmaEnPantalla,
  ): Promise<{ data: ConfiguracionFirmaEnPantalla }> {
    return api.patch('/formatos-firmados/configuracion', cambios);
  },

  crear(
    trabajadorId: string,
    datos: {
      tipoFormato: TipoFormatoFirma;
      versionTexto: string;
      /** `yyyy-mm-dd` */
      fechaFormato: string;
      firma: FirmaCapturada;
      /** Solo el Principal: marca de agua, borrador y eliminable. */
      prueba?: boolean;
    },
  ): Promise<{ data: FormatoFirmadoCreado }> {
    return api.post(`/formatos-firmados/${trabajadorId}`, datos);
  },

  /** Anula el formato y su PDF; los dos quedan en el expediente como anulados. */
  anular(
    trabajadorId: string,
    idFormato: string,
    razonAnulacion: string,
  ): Promise<{ data: { _id: string; estado: 'ANULADO'; documentoExterno: any } }> {
    return api.post(`/formatos-firmados/${trabajadorId}/${idFormato}/anular`, { razonAnulacion });
  },

  /** Elimina una firma de prueba con su PDF (las reales solo se anulan). */
  eliminarPrueba(trabajadorId: string, idFormato: string): Promise<{ data: { _id: string; eliminado: true } }> {
    return api.delete(`/formatos-firmados/${trabajadorId}/${idFormato}`);
  },
};
