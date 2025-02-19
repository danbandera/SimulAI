import axios from "../config/axios";

export interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
  created_at?: string;
}

export const getUsersRequest = async () => {
  const response = await axios.get(`/users`);
  return response.data;
};

export const createUserRequest = async (user: User) => {
  const response = await axios.post(`/users`, user);
  return response.data;
};

export const updateUserRequest = async (id: number, user: User) => {
  const response = await axios.put(`/users/${id}`, user);
  return response.data;
};

export const deleteUserRequest = async (id: number) => {
  await axios.delete(`/users/${id}`);
};

export const getUserRequest = async (id: number) => {
  const response = await axios.get(`/users/${id}`);
  return response.data;
};
