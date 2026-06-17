import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const proveedor = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/proveedores-salud`,
  }),
);

export default proveedor;
