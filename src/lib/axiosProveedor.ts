import { createAxiosClient } from './createAxiosClient';

const proveedor = createAxiosClient(
  `${import.meta.env.VITE_API_URL}/proveedores-salud`,
);

export default proveedor;
