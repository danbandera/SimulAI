import axios from "../config/axios";

export interface Conversation {
  scenarioId: number;
  userId: number;
  conversation: Array<{
    role: string;
    message: string;
    audioUrl?: string;
  }>;
  facialExpressions?: any[];
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
  created_by?: number;
  created_by_user?: User;
  aspects?: string;
  categories?: string;
  files?: string[];
  assignedIA?: string;
  assignedIAModel?: string;
  generated_image_url?: string;
  timeLimit?: number; // Time limit in minutes
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
  facialExpressions?: any[],
  elapsedTime?: number,
) => {
  if (!scenarioId || !userId) {
    throw new Error("Missing required parameters");
  }

  console.log("Sending conversation request with:", {
    scenarioId,
    userId,
    conversationLength: conversation.length,
    conversationSample: conversation.slice(0, 1),
    facialExpressionsCount: facialExpressions?.length || 0,
    elapsedTime: elapsedTime || 0,
  });

  // Ensure the body matches exactly what the server expects
  const conversationData = {
    userId: Number(userId),
    conversation: conversation,
    facialExpressions: facialExpressions || [],
    elapsedTime: elapsedTime || 0, // Add elapsed time to request body
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

export const getOpenAIAssistantsRequest = async () => {
  try {
    const response = await axios.get("/api/openai/assistants");
    return response.data.assistants;
  } catch (error) {
    console.error("Error fetching OpenAI assistants:", error);
    throw error;
  }
};

export const generateReportWithAssistantRequest = async (
  assistantId: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
) => {
  try {
    const response = await axios.post("/api/openai/generate-report", {
      assistantId,
      messages,
      systemPrompt,
    });
    return response.data.report;
  } catch (error) {
    console.error("Error generating report with assistant:", error);
    throw error;
  }
};

// Report management API functions
export const saveReportRequest = async (
  scenarioId: number | string,
  title: string,
  content: string,
  conversationsIds: number[],
  userId: number,
) => {
  try {
    const response = await axios.post(`/scenarios/${scenarioId}/reports`, {
      title,
      content,
      conversations_ids: conversationsIds,
      user_id: userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error saving report:", error);
    throw error;
  }
};

export const getReportsRequest = async (scenarioId: number | string) => {
  try {
    const response = await axios.get(`/scenarios/${scenarioId}/reports`);
    return response.data;
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};

export const getReportByIdRequest = async (
  scenarioId: number | string,
  reportId: number | string,
) => {
  try {
    const response = await axios.get(
      `/scenarios/${scenarioId}/reports/${reportId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching report:", error);
    throw error;
  }
};

export const exportReportToPdfRequest = async (
  scenarioId: number | string,
  reportId: number | string,
) => {
  try {
    // Get current language from i18n
    const currentLanguage = localStorage.getItem("i18nextLng") || "es";

    window.open(
      `${axios.defaults.baseURL}/scenarios/${scenarioId}/reports/${reportId}/export/pdf?lang=${currentLanguage}`,
      "_blank",
    );
    return true;
  } catch (error) {
    console.error("Error exporting report to PDF:", error);
    throw error;
  }
};

export const exportReportToWordRequest = async (
  scenarioId: number | string,
  reportId: number | string,
) => {
  try {
    // Get current language from i18n
    const currentLanguage = localStorage.getItem("i18nextLng") || "es";

    window.open(
      `${axios.defaults.baseURL}/scenarios/${scenarioId}/reports/${reportId}/export/word?lang=${currentLanguage}`,
      "_blank",
    );
    return true;
  } catch (error) {
    console.error("Error exporting report to Word:", error);
    throw error;
  }
};

export const updateReportShowToUserRequest = async (
  scenarioId: number | string,
  reportId: number | string,
  showToUser: boolean,
) => {
  try {
    const response = await axios.patch(
      `/scenarios/${scenarioId}/reports/${reportId}/show-to-user`,
      { show_to_user: showToUser },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating report show to user flag:", error);
    throw error;
  }
};

export const getScenarioElapsedTimeRequest = async (id: number) => {
  const response = await axios.get(`/scenarios/${id}/elapsed-time`);
  return response.data;
};

export const resetScenarioTimerRequest = async (id: number) => {
  const response = await axios.delete(`/scenarios/${id}/reset-timer`);
  return response.data;
};
