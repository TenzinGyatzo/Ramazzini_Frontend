import api from '@/lib/axios';
import type { TextoFormatoFirma, TipoFormatoFirma } from '@/types/formatoFirma';

export default {
  getTexto(tipoFormato: TipoFormatoFirma): Promise<{ data: TextoFormatoFirma }> {
    return api.get(`/formatos-firmados/textos/${tipoFormato}`);
  },
};
