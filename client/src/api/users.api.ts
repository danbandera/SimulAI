import axios from "axios";

const API = "http://localhost:4000/api";

export interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
  created_at?: string;
}

export const getUsersRequest = async () => {
  const response = await axios.get(`${API}/users`);
  return response.data;
};

export const createUserRequest = async (user: User) => {
  const response = await axios.post(`${API}/users`, user);
  return response.data;
};

export const updateUserRequest = async (id: number, user: User) => {
  const response = await axios.put(`${API}/users/${id}`, user);
  return response.data;
};

export const deleteUserRequest = async (id: number) => {
  await axios.delete(`${API}/users/${id}`);
};

export const getUserRequest = async (id: number) => {
  const response = await axios.get(`${API}/users/${id}`);
  return response.data;
};
