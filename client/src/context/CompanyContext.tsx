import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  getCompaniesRequest,
  createCompanyRequest,
  deleteCompanyRequest,
  updateCompanyRequest,
  getCompanyRequest,
  Company,
} from "../api/companies.api";
import { useAuth } from "./AuthContext";

interface CompanyContextType {
  companies: Company[];
  getCompanies: () => Promise<void>;
  createCompany: (company: Company) => Promise<Company>;
  deleteCompany: (id: number) => Promise<void>;
  updateCompany: (id: number, company: Company) => Promise<Company>;
  getCompany: (id: number) => Promise<Company>;
}

interface CompanyProviderProps {
  children: ReactNode;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanies must be used within a CompanyProvider");
  }
  return context;
};

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const { user } = useAuth();

  const getCompanies = async () => {
    try {
      const response = await getCompaniesRequest();
      setCompanies(response);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const createCompany = async (company: Company) => {
    try {
      const response = await createCompanyRequest(company);
      setCompanies([...companies, response]);
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error creating company";
      console.error("Error creating company:", errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteCompany = async (id: number) => {
    try {
      await deleteCompanyRequest(id);
      setCompanies(companies.filter((company) => company.id !== id));
    } catch (error) {
      console.error("Error deleting company:", error);
      throw error;
    }
  };

  const updateCompany = async (id: number, company: Company) => {
    try {
      const response = await updateCompanyRequest(id, company);
      if (response) {
        setCompanies(companies.map((c) => (c.id === id ? response : c)));
        return response;
      }
      return null;
    } catch (error) {
      console.error("Error updating company:", error);
      throw error;
    }
  };

  const getCompany = async (id: number) => {
    try {
      const response = await getCompanyRequest(id);
      return response;
    } catch (error) {
      console.error("Error fetching company:", error);
      throw error;
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        getCompanies,
        createCompany,
        deleteCompany,
        updateCompany,
        getCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
