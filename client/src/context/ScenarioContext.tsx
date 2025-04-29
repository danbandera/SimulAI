import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "react-hot-toast";
import {
  getScenarioRequest,
  getScenariosRequest,
  createScenarioRequest,
  updateScenarioRequest,
  deleteScenarioRequest,
  Conversation,
  saveConversationRequest,
  getConversationsRequest,
  generateImageRequest,
} from "../api/scenarios.api";

interface Scenario {
  id?: number;
  title: string;
  context: string;
  status: string;
  users: number[];
  created_at?: string;
  updated_at?: string;
  parent_scenario?: number;
  user_id_assigned?: number;
  created_by?: number;
  aspects?: { value: string; label: string }[];
  files?: File[];
  assignedIA?: string;
  assignedIAModel?: string;
  audio_url?: string;
  generated_image_url?: string;
  show_image_prompt?: boolean;
  interactive_avatar?: string;
  avatar_language?: string;
}

interface ScenarioContextValue {
  scenarios: Scenario[];
  loadScenarios: () => Promise<void>;
  createScenario: (scenarioData: FormData) => Promise<void>;
  deleteScenario: (id: number) => Promise<void>;
  getScenario: (id: number) => Promise<Scenario>;
  updateScenario: (id: number, scenarioData: FormData) => Promise<void>;
  saveConversation: (
    scenarioId: number,
    conversation: Array<{ role: string; message: string; audioUrl?: string }>,
    userId: number,
    facialExpressions?: any[],
  ) => Promise<void>;
  getConversations: (scenarioId: number) => Promise<Conversation[]>;
  generateImage: (prompt: string) => Promise<string>;
}

interface ScenarioProviderProps {
  children: ReactNode;
}

const ScenarioContext = createContext<ScenarioContextValue | undefined>(
  undefined,
);

export const useScenarios = () => {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error("useScenarios must be used within a ScenarioProvider");
  }
  return context;
};

export const ScenarioProvider = ({ children }: ScenarioProviderProps) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const loadScenarios = async () => {
    try {
      const response = await getScenariosRequest();
      setScenarios(response);
    } catch (error) {
      console.error("Error loading scenarios:", error);
      toast.error("Error loading scenarios");
    }
  };

  const createScenario = async (scenarioData: FormData) => {
    try {
      const response = await createScenarioRequest(scenarioData);
      setScenarios([...scenarios, response]);
      toast.success("Scenario created successfully");
    } catch (error) {
      console.error("Error creating scenario:", error);
      toast.error("Error creating scenario");
      throw error;
    }
  };

  const deleteScenario = async (id: number) => {
    try {
      await deleteScenarioRequest(id);
      setScenarios(scenarios.filter((scenario) => scenario.id !== id));
      toast.success("Scenario deleted successfully");
    } catch (error) {
      console.error("Error deleting scenario:", error);
      toast.error("Error deleting scenario");
      throw error;
    }
  };

  const getScenario = async (id: number) => {
    try {
      const response = await getScenarioRequest(id);
      return response;
    } catch (error) {
      console.error("Error getting scenario:", error);
      toast.error("Error getting scenario");
      throw error;
    }
  };

  const updateScenario = async (id: number, scenarioData: FormData) => {
    try {
      const response = await updateScenarioRequest(id, scenarioData);
      setScenarios(scenarios.map((s) => (s.id === id ? response : s)));
      toast.success("Scenario updated successfully");
    } catch (error) {
      console.error("Error updating scenario:", error);
      toast.error("Error updating scenario");
      throw error;
    }
  };

  const saveConversation = async (
    scenarioId: number,
    conversation: Array<{ role: string; message: string; audioUrl?: string }>,
    userId: number,
    facialExpressions?: any[],
  ) => {
    try {
      await saveConversationRequest(
        scenarioId,
        conversation,
        userId,
        facialExpressions,
      );
      toast.success("Conversation saved successfully");
    } catch (error) {
      console.error("Error saving conversation:", error);
      toast.error("Error saving conversation");
      throw error;
    }
  };

  const getConversations = async (scenarioId: number) => {
    try {
      const response = await getConversationsRequest(scenarioId);
      return response;
    } catch (error) {
      console.error("Error getting conversations:", error);
      toast.error("Error getting conversations");
      throw error;
    }
  };

  const generateImage = async (prompt: string) => {
    try {
      const response = await generateImageRequest(prompt);
      toast.success("Image generated successfully");
      return response.url;
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Error generating image");
      throw error;
    }
  };

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
        loadScenarios,
        createScenario,
        deleteScenario,
        getScenario,
        updateScenario,
        saveConversation,
        getConversations,
        generateImage,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
};
