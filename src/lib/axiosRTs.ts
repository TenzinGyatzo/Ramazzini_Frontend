import { createAxiosClient } from './createAxiosClient';

const rt = createAxiosClient(`${import.meta.env.VITE_API_URL}/riesgos-trabajo`);

export default rt;
