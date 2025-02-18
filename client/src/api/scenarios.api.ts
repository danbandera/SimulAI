import axios from "axios";

const API = "http://localhost:4000/api";

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
  const response = await axios.get(`${API}/scenarios`);
  return response.data;
};

export const createScenarioRequest = async (scenario: Scenario) => {
  const response = await axios.post(`${API}/scenarios`, scenario);
  return response.data;
};

export const deleteScenarioRequest = async (id: number) => {
  const response = await axios.delete(`${API}/scenarios/${id}`);
  return response.data;
};

export const getScenarioRequest = async (id: number) => {
  const response = await axios.get(`${API}/scenarios/${id}`);
  return response.data;
};

export const updateScenarioRequest = async (id: number, scenario: Scenario) => {
  const response = await axios.put(`${API}/scenarios/${id}`, scenario);
  return response.data;
};
