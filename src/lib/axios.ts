import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const api = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
  }),
);

export default api;
