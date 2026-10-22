import api from '@/lib/axios';
import type { FirmaCapturada } from '@/helpers/capturaFirma';
import type { TextoFormatoFirma, TipoFormatoFirma } from '@/types/formatoFirma';

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
};
