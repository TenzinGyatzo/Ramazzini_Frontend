import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const pagos = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/pagos`,
  }),
);

export default pagos;
