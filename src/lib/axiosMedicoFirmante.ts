import { createAxiosClient } from './createAxiosClient';

const medicoFirmante = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/medicos-firmantes`,
);

export default medicoFirmante;
