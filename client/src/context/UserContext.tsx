import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  getUsersRequest,
  createUserRequest,
  deleteUserRequest,
  updateUserRequest,
  getUserRequest,
} from "../api/users.api";
import { useAuth } from "./AuthContext";

interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  password: string;
  created_by: number;
  created_at?: string;
}

interface UserContextType {
  users: User[];
  currentUser: User | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (user?.id) {
        try {
          const userData = await getUser(Number(user.id));
          setCurrentUser(userData);
        } catch (error) {
          console.error("Error loading current user:", error);
        }
      }
    };

    loadCurrentUser();
  }, [user]);

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
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "Error creating user";
      console.error("Error creating user:", errorMessage);
      throw new Error(errorMessage);
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
      if (response) {
        setUsers(users.map((u) => (u.id === id ? response : u)));
        return response;
      }
      return null;
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
        currentUser,
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
