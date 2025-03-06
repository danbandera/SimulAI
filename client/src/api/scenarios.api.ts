import axios from "../config/axios";

export interface Conversation {
  scenarioId: number;
  userId: number;
  conversation: Array<{
    role: string;
    message: string;
  }>;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Scenario {
  id?: number;
  title: string;
  description: string;
  status: string;
  users: number[];
  created_at?: string;
  updated_at?: string;
  parent_scenario?: number;
  user_id_assigned?: number;
  created_by?: number;
  assigned_user?: User;
  created_by_user?: User;
  aspects?: { value: string; label: string }[];
  files?: string[];
  assignedIA?: string;
  assignedIAModel?: string;
}

export const getScenariosRequest = async () => {
  const response = await axios.get(`/scenarios`);
  return response.data;
};

export const createScenarioRequest = async (scenarioData: FormData) => {
  const response = await axios.post(`/scenarios`, scenarioData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteScenarioRequest = async (id: number) => {
  const response = await axios.delete(`/scenarios/${id}`);
  return response.data;
};

export const getScenarioRequest = async (id: number) => {
  const response = await axios.get(`/scenarios/${id}`);
  return response.data;
};

export const updateScenarioRequest = async (
  id: number,
  scenarioData: FormData,
) => {
  const response = await axios.put(`/scenarios/${id}`, scenarioData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const saveConversationRequest = async (
  scenarioId: number | string,
  conversation: Array<{ role: string; message: string }>,
  userId: number | undefined,
) => {
  if (!scenarioId || !userId) {
    throw new Error("Missing required parameters");
  }

  const conversationData: Conversation = {
    scenarioId: Number(scenarioId),
    userId: Number(userId),
    conversation: conversation,
  };

  const response = await axios.post(
    `/scenarios/${scenarioId}/conversations`,
    conversationData,
  );
  return response.data;
};

export const getConversationsRequest = async (scenarioId: number) => {
  const response = await axios.get(`/scenarios/${scenarioId}/conversations`);
  return response.data;
};

export const getConversationRequest = async (
  scenarioId: number,
  conversationId: number,
) => {
  const response = await axios.get(
    `/scenarios/${scenarioId}/conversations/${conversationId}`,
  );
  return response.data;
};
