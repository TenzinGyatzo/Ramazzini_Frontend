import axios from 'axios';
import { configureAxiosAuth } from './configureAxiosAuth';

/** Instancia Axios con cookies HttpOnly + interceptor 401→refresh (H-10/H-12). */
export function createAxiosClient(baseURL: string) {
  return configureAxiosAuth(
    axios.create({
      baseURL,
    }),
  );
}
