import { createContext, useContext, useState, ReactNode } from "react";
import {
  getUsersRequest,
  createUserRequest,
  deleteUserRequest,
  updateUserRequest,
  getUserRequest,
} from "../api/users.api";

interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
  created_at?: string;
}

interface UserContextType {
  users: User[];
  getUsers: () => Promise<void>;
  createUser: (user: User) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  updateUser: (id: number, user: User) => Promise<void>;
  getUser: (id: number) => Promise<User>;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUsers must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const [users, setUsers] = useState<User[]>([]);

  const getUsers = async () => {
    try {
      const response = await getUsersRequest();
      setUsers(response);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const createUser = async (user: User) => {
    try {
      const response = await createUserRequest(user);
      setUsers([...users, response]);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await deleteUserRequest(id);
      setUsers(users.filter((user) => user.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  const updateUser = async (id: number, user: User) => {
    try {
      const response = await updateUserRequest(id, user);
      setUsers(users.map((u) => (u.id === id ? response : u)));
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const getUser = async (id: number) => {
    try {
      const response = await getUserRequest(id);
      return response;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        getUsers,
        createUser,
        deleteUser,
        updateUser,
        getUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
