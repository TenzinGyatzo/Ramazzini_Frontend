import { createAxiosClient } from './createAxiosClient';

const enfermeraFirmante = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/enfermeras-firmantes`,
);

export default enfermeraFirmante;
