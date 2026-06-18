import axios from 'axios';
import type { 
  InformePersonalizacion, 
  CreateInformePersonalizacionDto, 
  UpdateInformePersonalizacionDto 
} from '@/interfaces/informe-personalizacion.interface';

const API_URL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';

class InformePersonalizacionService {
  private baseURL = `${API_URL}/api/informe-personalizacion`;

  private requestConfig() {
    return {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  async create(data: CreateInformePersonalizacionDto): Promise<InformePersonalizacion> {
    const response = await axios.post(this.baseURL, data, this.requestConfig());
    return response.data;
  }

  async findByEmpresa(idEmpresa: string): Promise<InformePersonalizacion[]> {
    const response = await axios.get(`${this.baseURL}/empresa/${idEmpresa}`, this.requestConfig());
    return response.data;
  }

  async findByEmpresaAndCentro(
    idEmpresa: string, 
    idCentroTrabajo: string
  ): Promise<InformePersonalizacion | null> {
    const response = await axios.get(
      `${this.baseURL}/empresa/${idEmpresa}/centro/${idCentroTrabajo}`,
      this.requestConfig()
    );
    return response.data;
  }

  async findByEmpresaOnly(idEmpresa: string): Promise<InformePersonalizacion | null> {
    const response = await axios.get(
      `${this.baseURL}/empresa/${idEmpresa}/centro`,
      this.requestConfig()
    );
    return response.data;
  }

  async update(id: string, data: UpdateInformePersonalizacionDto): Promise<InformePersonalizacion> {
    const response = await axios.put(`${this.baseURL}/${id}`, data, this.requestConfig());
    return response.data;
  }

  async upsertByEmpresa(
    idEmpresa: string, 
    data: UpdateInformePersonalizacionDto
  ): Promise<InformePersonalizacion> {
    const response = await axios.put(`${this.baseURL}/upsert/empresa/${idEmpresa}`, data, this.requestConfig());
    return response.data;
  }

  async upsertByEmpresaAndCentro(
    idEmpresa: string,
    idCentroTrabajo: string,
    data: UpdateInformePersonalizacionDto
  ): Promise<InformePersonalizacion> {
    const response = await axios.put(
      `${this.baseURL}/upsert/empresa/${idEmpresa}/centro/${idCentroTrabajo}`,
      data,
      this.requestConfig()
    );
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`, this.requestConfig());
  }
}

export const informePersonalizacionService = new InformePersonalizacionService();
