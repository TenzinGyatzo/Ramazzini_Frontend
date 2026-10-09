import { createAxiosClient } from './createAxiosClient';

const incapacidadesEmpresa = createAxiosClient(`${import.meta.env.VITE_API_URL}/incapacidades-empresa`);

export default incapacidadesEmpresa;
