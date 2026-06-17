import axios from "axios";
import { attachAuthToken } from "./attachAuthToken";

const rt = attachAuthToken(
  axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/riesgos-trabajo`,
  }),
);

export default rt;
