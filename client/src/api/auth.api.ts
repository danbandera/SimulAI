import axios from "../config/axios";

interface User {
  email: string;
  password: string;
}

export const loginRequest = async (user: User) => {
  try {
    const response = await axios.post("/login", user);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyToken = async () => {
  try {
    const response = await axios.get("/verify-token");
    return response;
  } catch (error) {
    throw error;
  }
};

export const logoutRequest = async () => {
  try {
    const response = await axios.post("/logout");
    return response.data;
  } catch (error) {
    throw error;
  }
};
