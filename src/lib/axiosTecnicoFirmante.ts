import { createAxiosClient } from './createAxiosClient';

const tecnicoFirmante = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/tecnicos-firmantes`,
);

export default tecnicoFirmante;
