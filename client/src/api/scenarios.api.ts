import axiosInstance from "../config/axios";

export interface Scenario {
  id?: number;
  title: string;
  description: string;
  status: string;
  users: number[];
  created_at?: string;
  updated_at?: string;
  parent_scenario?: number;
}

export const getScenariosRequest = async () => {
  const response = await axiosInstance.get(`/scenarios`);
  return response.data;
};

export const createScenarioRequest = async (scenario: Scenario) => {
  const response = await axiosInstance.post(`/scenarios`, scenario);
  return response.data;
};

export const deleteScenarioRequest = async (id: number) => {
  const response = await axiosInstance.delete(`/scenarios/${id}`);
  return response.data;
};

export const getScenarioRequest = async (id: number) => {
  const response = await axiosInstance.get(`/scenarios/${id}`);
  return response.data;
};

export const updateScenarioRequest = async (id: number, scenario: Scenario) => {
  const response = await axiosInstance.put(`/scenarios/${id}`, scenario);
  return response.data;
};
