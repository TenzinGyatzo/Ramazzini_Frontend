import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const tecnicoFirmante = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/tecnicos-firmantes`,
  }),
);

export default tecnicoFirmante;
