import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const enfermeraFirmante = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/enfermeras-firmantes`,
  }),
);

export default enfermeraFirmante;
