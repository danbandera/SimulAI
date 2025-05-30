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
  departments: Department[];
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export const getCompaniesRequest = async () => {
  const response = await axios.get("/companies");
  return response.data;
};

export const createCompanyRequest = async (company: Company) => {
  const response = await axios.post("/companies", company);
  return response.data;
};

export const getCompanyRequest = async (id: number) => {
  const response = await axios.get(`/companies/${id}`);
  return response.data;
};

export const updateCompanyRequest = async (id: number, company: Company) => {
  const response = await axios.put(`/companies/${id}`, company);
  return response.data;
};

export const deleteCompanyRequest = async (id: number) => {
  const response = await axios.delete(`/companies/${id}`);
  return response.data;
};
