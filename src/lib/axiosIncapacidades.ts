import { createAxiosClient } from './createAxiosClient';

const incapacidades = createAxiosClient(`${import.meta.env.VITE_API_URL}/incapacidades`);

export default incapacidades;
