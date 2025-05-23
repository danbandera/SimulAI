import axios from "../config/axios";

export interface User {
  id?: number;
  name: string;
  lastname: string;
  department?: string;
  email: string;
  role: string;
  password: string;
  profile_image?: string;
  created_by: number;
  created_at?: string;
  users?: number[];
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

export const updateUserProfileImageRequest = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append("profile_image", file);

  try {
    const response = await axios.put(`/users/${id}/profile-image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error in updateUserProfileImageRequest:", error);
    throw error;
  }
};

export const importUsersFromCSVRequest = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post("/users/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
