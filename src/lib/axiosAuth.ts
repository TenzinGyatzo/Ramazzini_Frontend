import { createAxiosClient } from './createAxiosClient';

const auth = createAxiosClient(`${import.meta.env.VITE_API_URL}/auth`);

export default auth;
