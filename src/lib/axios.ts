import { createAxiosClient } from './createAxiosClient';

const api = createAxiosClient(`${import.meta.env.VITE_API_URL}/api`);

export default api;
