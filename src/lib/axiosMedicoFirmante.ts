import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const medicoFirmante = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/medicos-firmantes`,
  }),
);

export default medicoFirmante;
