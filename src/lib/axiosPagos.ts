import { createAxiosClient } from './createAxiosClient';

const pagos = createAxiosClient(`${import.meta.env.VITE_API_URL}/pagos`);

export default pagos;
