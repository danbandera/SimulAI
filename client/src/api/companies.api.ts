import axios from "../config/axios";

export interface Department {
  id?: number;
  name: string;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id?: number;
  name: string;
  logo?: string;
  departments: Department[];
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export const getCompaniesRequest = async () => {
  const response = await axios.get("/companies");
  return response.data;
};

export const createCompanyRequest = async (company: Company | FormData) => {
  const config =
    company instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

  const response = await axios.post("/companies", company, config);
  return response.data;
};

export const getCompanyRequest = async (id: number) => {
  const response = await axios.get(`/companies/${id}`);
  return response.data;
};

export const updateCompanyRequest = async (
  id: number,
  company: Company | FormData,
) => {
  const config =
    company instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};

  const response = await axios.put(`/companies/${id}`, company, config);
  return response.data;
};

export const deleteCompanyRequest = async (id: number) => {
  const response = await axios.delete(`/companies/${id}`);
  return response.data;
};
