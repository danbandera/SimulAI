import axios from "../config/axios";

export interface Conversation {
  scenarioId: number;
  userId: number;
  conversation: Array<{
    role: string;
    message: string;
    audioUrl?: string;
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
  context: string;
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
  generated_image_url?: string;
}

export const getScenariosRequest = async () => {
  const response = await axios.get(`/scenarios`);
  return response.data;
};

export const createScenarioRequest = async (scenarioData: FormData) => {
  try {
    // Log the FormData contents for debugging
    // console.log("FormData contents:");
    // for (const pair of scenarioData.entries()) {
    //   if (pair[0] === "files") {
    //     console.log(pair[0], pair[1], "File object present");
    //   } else {
    //     console.log(pair[0], pair[1]);
    //   }
    // }

    // Make sure Content-Type is NOT set (let the browser set it with the boundary)
    const response = await axios.post(`/scenarios`, scenarioData, {
      headers: {
        // Don't set Content-Type for FormData
      },
      timeout: 60000, // 60 seconds timeout
    });
    return response.data;
  } catch (error) {
    console.error("Error in createScenarioRequest:", error);
    throw error;
  }
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
  try {
    // Log the FormData contents for debugging
    // console.log("Update FormData contents:");
    // for (const pair of scenarioData.entries()) {
    //   if (pair[0] === "files") {
    //     console.log(pair[0], pair[1], "File object present");
    //   } else {
    //     console.log(pair[0], pair[1]);
    //   }
    // }

    // Make sure Content-Type is NOT set (let the browser set it with the boundary)
    const response = await axios.put(`/scenarios/${id}`, scenarioData, {
      headers: {
        // Don't set Content-Type for FormData
      },
      timeout: 60000, // 60 seconds timeout
    });
    return response.data;
  } catch (error) {
    console.error("Error in updateScenarioRequest:", error);
    throw error;
  }
};

export const saveConversationRequest = async (
  scenarioId: number | string,
  conversation: Array<{ role: string; message: string; audioUrl?: string }>,
  userId: number | undefined,
) => {
  if (!scenarioId || !userId) {
    throw new Error("Missing required parameters");
  }

  console.log("Sending conversation request with:", {
    scenarioId,
    userId,
    conversationLength: conversation.length,
    conversationSample: conversation.slice(0, 1),
  });

  // Ensure the body matches exactly what the server expects
  const conversationData = {
    userId: Number(userId),
    conversation: conversation,
  };

  try {
    const response = await axios.post(
      `/scenarios/${scenarioId}/conversations`,
      conversationData,
    );
    return response.data;
  } catch (error: any) {
    console.error("Error in saveConversationRequest:", error);
    if (error.response) {
      console.error("Server response:", error.response.data);
    }
    throw error;
  }
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

export const generateImageRequest = async (prompt: string) => {
  try {
    const response = await axios.post("/scenarios/generate-image", {
      prompt,
    });
    return response.data;
  } catch (error) {
    console.error("Error in generateImageRequest:", error);
    throw error;
  }
};
