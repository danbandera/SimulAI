import axiosInstance from "../config/axios";

export interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
  created_at?: string;
}

export const getUsersRequest = async () => {
  const response = await axiosInstance.get(`/users`);
  return response.data;
};

export const createUserRequest = async (user: User) => {
  const response = await axiosInstance.post(`/users`, user);
  return response.data;
};

export const updateUserRequest = async (id: number, user: User) => {
  const response = await axiosInstance.put(`/users/${id}`, user);
  return response.data;
};

export const deleteUserRequest = async (id: number) => {
  await axiosInstance.delete(`/users/${id}`);
};

export const getUserRequest = async (id: number) => {
  const response = await axiosInstance.get(`/users/${id}`);
  return response.data;
};
