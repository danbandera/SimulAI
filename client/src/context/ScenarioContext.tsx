import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "react-hot-toast";
import {
  getScenarioRequest,
  getScenariosRequest,
  createScenarioRequest,
  updateScenarioRequest,
  deleteScenarioRequest,
  bulkDeleteScenariosRequest,
  Conversation,
  saveConversationRequest,
  getConversationsRequest,
  generateImageRequest,
  getScenarioElapsedTimeRequest,
  resetScenarioTimerRequest,
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
  aspects?: string;
  categories?: string;
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
  bulkDeleteScenarios: (scenarioIds: number[]) => Promise<{
    deleted: number;
    denied: number;
    deniedScenarios: Array<{ id: number; reason: string }>;
  }>;
  getScenario: (id: number) => Promise<Scenario>;
  updateScenario: (id: number, scenarioData: FormData) => Promise<void>;
  saveConversation: (
    scenarioId: number,
    conversation: Array<{ role: string; message: string; audioUrl?: string }>,
    userId: number | undefined,
    facialExpressions?: any[],
    elapsedTime?: number,
  ) => Promise<any>;
  getConversations: (scenarioId: number) => Promise<Conversation[]>;
  generateImage: (prompt: string) => Promise<string>;
  getScenarioElapsedTime: (scenarioId: number) => Promise<{
    time_limit: number;
    total_elapsed_time: number;
    remaining_time: number;
    conversations_count: number;
  }>;
  resetScenarioTimer: (scenarioId: number) => Promise<any>;
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

  const bulkDeleteScenarios = async (scenarioIds: number[]) => {
    try {
      const response = await bulkDeleteScenariosRequest(scenarioIds);
      setScenarios(
        scenarios.filter((scenario) => !scenarioIds.includes(scenario.id!)),
      );
      return response;
    } catch (error: any) {
      console.error("Error bulk deleting scenarios:", error);
      throw new Error(
        error.response?.data?.message || "Error deleting scenarios",
      );
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
    userId: number | undefined,
    facialExpressions?: any[],
    elapsedTime?: number,
  ): Promise<any> => {
    try {
      return await saveConversationRequest(
        scenarioId,
        conversation,
        userId,
        facialExpressions,
        elapsedTime,
      );
    } catch (error) {
      console.error("Error saving conversation:", error);
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

  const getScenarioElapsedTime = async (scenarioId: number) => {
    try {
      const response = await getScenarioElapsedTimeRequest(scenarioId);
      return response;
    } catch (error) {
      console.error("Error getting scenario elapsed time:", error);
      toast.error("Error getting scenario elapsed time");
      throw error;
    }
  };

  const resetScenarioTimer = async (scenarioId: number) => {
    try {
      const response = await resetScenarioTimerRequest(scenarioId);
      return response;
    } catch (error) {
      console.error("Error resetting scenario timer:", error);
      toast.error("Error resetting scenario timer");
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
        bulkDeleteScenarios,
        getScenario,
        updateScenario,
        saveConversation,
        getConversations,
        generateImage,
        getScenarioElapsedTime,
        resetScenarioTimer,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
};
