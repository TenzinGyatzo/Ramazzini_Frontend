import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const auth = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/auth`,
  }),
);

export default auth;
