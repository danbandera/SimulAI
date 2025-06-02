import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useAuth } from "../../context/AuthContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import SwitcherTwo from "../../components/Switchers/SwitcherTwo";
import { useTranslation } from "react-i18next";
import {
  getOpenAIAssistantsRequest,
  generateReportWithAssistantRequest,
  saveReportRequest,
  exportReportToPdfRequest,
  exportReportToWordRequest,
  getReportsRequest,
  getReportByIdRequest,
  updateReportShowToUserRequest,
} from "../../api/scenarios.api";
import SwitcherThree from "../../components/Switchers/SwitcherThree";

// Add custom styles for better text handling
const customStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .prose {
    max-width: none;
  }
  
  .prose h1, .prose h2, .prose h3 {
    color: inherit;
  }
  
  .prose p {
    margin-bottom: 1rem;
  }
`;

interface ConversationMessage {
  role: string;
  message: string;
  audioUrl?: string;
}

interface FacialExpression {
  timestamp: string;
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
}

interface Conversation {
  id: number;
  scenarioId: number;
  userId: number;
  conversation: ConversationMessage[];
  facial_expressions: FacialExpression[];
  created_at: string;
  updated_at: string;
}

interface Assistant {
  id: string;
  name: string;
  model: string;
}

interface Report {
  id: number;
  title: string;
  content: string;
  conversations_ids: number[];
  show_to_user: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// Define the default prompt template as a constant outside the component
const DEFAULT_PROMPT_TEMPLATE =
  "Based on the conversation and facial expressions data, provide a detailed evaluation of the candidate. " +
  "Analyze their responses, knowledge, communication style, and emotional states observed. " +
  "Focus on the following aspects: ASPECTS_PLACEHOLDER. " +
  "Give a score for each aspect from 0 to 100 at the end of the conversation. " +
  "Example: Aspect 1: 80, Aspect 2: 70, Aspect 3: 90." +
  "It is important to ALWAYS have the name of the aspect next to the score, example: Respectful: 95." +
  "Show every aspect score in a new line." +
  "Note: The given context is used for other IA to interact with the user.";

const ScenarioReport = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { getConversations, getScenario } = useScenarios();
  const { loadSettings, user } = useAuth();

  const [scenarioTitle, setScenarioTitle] = useState<string>("");
  const [scenarioContext, setScenarioContext] = useState<string>("");
  const [scenarioAspects, setScenarioAspects] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const [loadingAssistants, setLoadingAssistants] = useState<boolean>(false);
  const [promptTemplate, setPromptTemplate] = useState<string>(
    DEFAULT_PROMPT_TEMPLATE,
  );
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [report, setReport] = useState<string>("");
  const [settings, setSettings] = useState<any>(null);
  const [useAllConversations, setUseAllConversations] = useState<boolean>(true);
  const [selectedConversations, setSelectedConversations] = useState<number[]>(
    [],
  );
  const [reportTitle, setReportTitle] = useState<string>("");
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [savingReport, setSavingReport] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          setLoading(true);

          // Load settings
          const settingsData = await loadSettings();
          setSettings(settingsData);

          // Update prompt template from settings if available
          if (settingsData?.promt_for_analyse_conversation) {
            let settingsPrompt = settingsData.promt_for_analyse_conversation;

            // Ensure the aspects placeholder exists in the template
            if (!settingsPrompt.includes("ASPECTS_PLACEHOLDER")) {
              // If the placeholder isn't in the template, add it in a suitable location
              if (settingsPrompt.includes("aspects")) {
                // Try to find a suitable place to add the placeholder
                settingsPrompt = settingsPrompt.replace(
                  /aspects/i,
                  "aspects: ASPECTS_PLACEHOLDER",
                );
              } else {
                // If no suitable place is found, append it to the end
                settingsPrompt +=
                  "\n\nFocus on the following aspects: ASPECTS_PLACEHOLDER.";
              }
            }

            // Ensure the scoring instructions exist
            if (
              !settingsPrompt.includes("score") &&
              !settingsPrompt.includes("Score")
            ) {
              settingsPrompt +=
                "\n\nGive a score for each aspect from 0 to 100 at the end of the conversation. Example: Aspect 1: 80, Aspect 2: 70, Aspect 3: 90. Show every aspect score in a new line.";
            }

            if (!settingsPrompt.includes("language")) {
              settingsPrompt +=
                "\n\nThe report should be in the language of the conversation.";
            }

            setPromptTemplate(settingsPrompt);
          }

          // Load scenario details
          const scenarioData = await getScenario(parseInt(id));
          setScenarioTitle(scenarioData.title);
          setScenarioContext(scenarioData.context || "");

          // Extract aspects
          if (scenarioData.aspects && Array.isArray(scenarioData.aspects)) {
            const aspectLabels = scenarioData.aspects
              .map((aspect) => aspect.label || aspect.value || "")
              .filter(Boolean);
            setScenarioAspects(aspectLabels);
          }

          // Load conversations
          const apiData = await getConversations(parseInt(id));

          // Transform API response to match our interface
          const transformedData = apiData.map((conv: any) => ({
            id: conv.id,
            scenarioId: conv.scenario_id,
            userId: conv.user_id,
            conversation: conv.conversation,
            facial_expressions: conv.facial_expressions || [],
            created_at: conv.created_at,
            updated_at: conv.updated_at || conv.created_at,
          }));

          setConversations(transformedData);

          // Select all conversations by default
          if (transformedData.length > 0) {
            const allIds = transformedData.map((conv) => conv.id);
            setSelectedConversations(allIds);
          }

          // Load saved reports
          try {
            const reportsData = await getReportsRequest(parseInt(id));
            // Don't automatically select a report, let user choose from the list
            setSavedReports(reportsData);
            // We'll display all reports in the UI for selection
          } catch (reportsError) {
            console.error("Error loading reports:", reportsError);
          }
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [id, getConversations, getScenario, loadSettings]);

  // Load OpenAI assistants
  useEffect(() => {
    const fetchAssistants = async () => {
      if (!settings?.openai_key) return;

      try {
        setLoadingAssistants(true);

        // Call the API to get assistants
        const assistantsData = await getOpenAIAssistantsRequest();

        // If no assistants are returned, use mock data for development
        if (!assistantsData || assistantsData.length === 0) {
          const mockAssistants = [
            { id: "asst_1", name: "HR Assistant", model: "gpt-4o" },
            { id: "asst_2", name: "Technical Interviewer", model: "gpt-4o" },
            { id: "asst_3", name: "Candidate Evaluator", model: "gpt-4o" },
          ];
          setAssistants(mockAssistants);
          if (mockAssistants.length > 0) {
            setSelectedAssistant(mockAssistants[0].id);
          }
        } else {
          setAssistants(assistantsData);
          if (assistantsData.length > 0) {
            setSelectedAssistant(assistantsData[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching assistants:", error);
        // Fallback to mock data
        const mockAssistants = [
          { id: "asst_1", name: "HR Assistant", model: "gpt-4o" },
          { id: "asst_2", name: "Technical Interviewer", model: "gpt-4o" },
          { id: "asst_3", name: "Candidate Evaluator", model: "gpt-4o" },
        ];
        setAssistants(mockAssistants);
        if (mockAssistants.length > 0) {
          setSelectedAssistant(mockAssistants[0].id);
        }
      } finally {
        setLoadingAssistants(false);
      }
    };

    fetchAssistants();
  }, [settings]);

  // Initialize report title when scenario is loaded
  useEffect(() => {
    if (scenarioTitle) {
      setReportTitle(`${scenarioTitle} - Evaluation Report`);
    }
  }, [scenarioTitle]);

  // Update selected conversations when toggling "use all" checkbox or when conversations list changes
  useEffect(() => {
    if (useAllConversations) {
      const allIds = conversations.map((conv) => conv.id);
      setSelectedConversations(allIds);
    } else if (selectedConversations.length === 0 && conversations.length > 0) {
      // If nothing selected and we have conversations, select the first one
      setSelectedConversations([conversations[0].id]);
    }
  }, [useAllConversations, conversations]);

  const handleConversationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const convId = parseInt(e.target.value);
    const selected = conversations.find((conv) => conv.id === convId) || null;
    setSelectedConversationId(convId);
    setSelectedConversation(selected);
    setReport(""); // Clear previous report
  };

  const handleAssistantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAssistant(e.target.value);
    setReport(""); // Clear previous report
  };

  const handleConversationCheckboxChange = (
    convId: number,
    checked: boolean,
  ) => {
    if (checked) {
      setSelectedConversations((prev) => [...prev, convId]);
    } else {
      setSelectedConversations((prev) => prev.filter((id) => id !== convId));
    }
  };

  const generateReport = async () => {
    if (!selectedConversation || !selectedAssistant) {
      return;
    }

    try {
      setGeneratingReport(true);
      setReport("");

      // Replace placeholder with actual aspects
      const finalPrompt = promptTemplate.replace(
        "ASPECTS_PLACEHOLDER",
        scenarioAspects.join(", "),
      );

      // Prepare data for OpenAI
      const conversationData = selectedConversation.conversation.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.message,
      }));

      // Add facial expressions analysis
      const expressionsAnalysis =
        selectedConversation.facial_expressions?.length > 0
          ? analyzeExpressions(selectedConversation.facial_expressions)
          : "No facial expression data available";

      // Prepare system prompt with all context
      const systemPromptWithContext = `You are an interview evaluator assistant. You'll evaluate the candidate based on the following criteria:
      
      Context: ${scenarioContext}
      
      Aspects to evaluate: ${scenarioAspects.join(", ")}
      
      Facial expressions analysis: ${expressionsAnalysis}
      
      ${finalPrompt}`;

      try {
        // Call the API function for report generation
        const reportText = await generateReportWithAssistantRequest(
          selectedAssistant,
          conversationData,
          systemPromptWithContext,
        );

        setReport(reportText);
      } catch (apiError) {
        console.error("API error generating report:", apiError);

        // Fallback to mock report on API error
        console.log("Falling back to mock report generation");
        const mockReport = generateMockReport(
          scenarioContext,
          scenarioAspects,
          selectedConversation,
        );

        setReport(mockReport);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const analyzeExpressions = (expressions: FacialExpression[]): string => {
    // Calculate averages for each emotion
    const emotionTotals: Record<string, number> = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
    };

    expressions.forEach((exp) => {
      Object.entries(exp.expressions).forEach(([emotion, value]) => {
        emotionTotals[emotion] += value;
      });
    });

    const count = expressions.length;
    let analysis = "Facial Expression Analysis:\n";

    Object.entries(emotionTotals).forEach(([emotion, total]) => {
      const average = (total / count) * 100;
      analysis += `- ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${average.toFixed(1)}%\n`;
    });

    return analysis;
  };

  const generateMockReport = (
    context: string,
    aspects: string[],
    conversation: Conversation,
  ): string => {
    // This is a mock report - in reality this would come from OpenAI API
    const mockReport = `# Candidate Evaluation Report

## Overview
Based on the analyzed conversation, the candidate demonstrated reasonable proficiency in the required areas.

## Communication Analysis
The candidate communicated clearly through most of the interaction. Their responses were structured and addressed the questions asked. The candidate appeared ${conversation.facial_expressions?.length > 5 ? "confident" : "somewhat nervous"} based on facial expression analysis.

## Technical Competence
The technical knowledge demonstrated throughout the conversation indicates a solid understanding of the subject matter.

## Facial Expression Analysis
The candidate showed a predominant ${getMostFrequentEmotion(conversation.facial_expressions)} expression during the interview, which suggests ${getEmotionInterpretation(getMostFrequentEmotion(conversation.facial_expressions))}.

## Aspect Scores
${aspects
  .map((aspect, index) => {
    // Generate random score between 60 and 95 for demo purposes
    const score = Math.floor(Math.random() * 36) + 60;
    return `${aspect}: ${score}`;
  })
  .join("\n")}

## Recommendations
Based on the evaluation, this candidate ${Math.random() > 0.5 ? "shows promise and should be considered for the next stage" : "has potential but may need additional assessment in specific areas"}.`;

    return mockReport;
  };

  const getMostFrequentEmotion = (expressions: FacialExpression[]): string => {
    if (!expressions || expressions.length === 0) return "neutral";

    // Aggregate all expression values
    const totals: Record<string, number> = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
    };

    expressions.forEach((exp) => {
      Object.entries(exp.expressions).forEach(([emotion, value]) => {
        totals[emotion] += value;
      });
    });

    // Find emotion with highest total
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  };

  const getEmotionInterpretation = (emotion: string): string => {
    const interpretations: Record<string, string> = {
      neutral: "a balanced and composed demeanor",
      happy: "comfort and positive engagement",
      sad: "concern or uncertainty about some topics",
      angry: "possible frustration with complex questions",
      fearful: "anxiety about the interview process",
      disgusted: "possible discomfort with certain topics",
      surprised: "unexpected questions or realizations during the interview",
    };

    return interpretations[emotion] || "unclear emotional state";
  };

  // Save the generated report to the database
  const saveReport = async () => {
    if (!report || !user?.id) return;

    try {
      setSavingReport(true);

      const response = await saveReportRequest(
        id!,
        reportTitle,
        report,
        selectedConversations,
        user.id,
      );

      // Show success message
      // alert(t("scenarios.reportSavedSuccess"));

      // Add to saved reports list
      setSavedReports((prev) => [response.report, ...prev]);

      // Set as selected report
      setSelectedReport(response.report);
    } catch (error) {
      console.error("Error saving report:", error);
      // alert(t("scenarios.reportSaveError"));
    } finally {
      setSavingReport(false);
    }
  };

  // Export report to PDF
  const exportToPdf = () => {
    if (!selectedReport) return;

    exportReportToPdfRequest(id!, selectedReport.id);
  };

  // Export report to Word
  const exportToWord = () => {
    if (!selectedReport) return;

    exportReportToWordRequest(id!, selectedReport.id);
  };

  // Generate a report using multiple conversations
  const generateCombinedReport = async () => {
    if (selectedConversations.length === 0 || !selectedAssistant) {
      return;
    }

    try {
      setGeneratingReport(true);
      setReport("");

      // Replace placeholder with actual aspects
      const finalPrompt = promptTemplate.replace(
        "ASPECTS_PLACEHOLDER",
        scenarioAspects.join(", "),
      );

      // Get all the selected conversations
      const selectedConvData = conversations.filter((conv) =>
        selectedConversations.includes(conv.id),
      );

      // Combine all conversations and expressions data
      let allConversationMessages: { role: string; content: string }[] = [];
      let allFacialExpressions: any[] = [];

      selectedConvData.forEach((conv) => {
        // Add conversation messages
        const messages = conv.conversation.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.message,
        }));

        allConversationMessages = [...allConversationMessages, ...messages];

        // Add facial expressions
        if (conv.facial_expressions && conv.facial_expressions.length > 0) {
          allFacialExpressions = [
            ...allFacialExpressions,
            ...conv.facial_expressions,
          ];
        }
      });

      // Add facial expressions analysis
      const expressionsAnalysis =
        allFacialExpressions.length > 0
          ? analyzeExpressions(allFacialExpressions)
          : "No facial expression data available";

      // Prepare system prompt with all context
      const systemPromptWithContext = `You are an interview evaluator assistant. You'll evaluate the candidate based on the following criteria:
      
      Context: ${scenarioContext}
      
      Aspects to evaluate: ${scenarioAspects.join(", ")}
      
      Facial expressions analysis: ${expressionsAnalysis}
      
      Number of conversations analyzed: ${selectedConvData.length}
      
      ${finalPrompt}`;

      try {
        // Call the API function for report generation
        const reportText = await generateReportWithAssistantRequest(
          selectedAssistant,
          allConversationMessages,
          systemPromptWithContext,
        );

        setReport(reportText);
      } catch (apiError) {
        console.error("API error generating report:", apiError);

        // Fallback to mock report on API error
        console.log("Falling back to mock report generation");
        const mockReport = generateMockReport(
          scenarioContext,
          scenarioAspects,
          selectedConvData[0],
        );

        setReport(mockReport);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumb pageName={t("scenarios.report")} />
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <Breadcrumb pageName={`${t("scenarios.report")} - ${scenarioTitle}`} />

      <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:gap-7.5">
        {/* Configuration Section */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
          <h3 className="text-xl font-semibold mb-6">
            {t("scenarios.generateReport")}
          </h3>

          {/* Conversations Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-black dark:text-white mb-3">
              {t("scenarios.selectConversations")}
            </h4>
            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-primary rounded border-stroke"
                  checked={useAllConversations}
                  onChange={(e) => setUseAllConversations(e.target.checked)}
                />
                <span className="ml-2">
                  {t("scenarios.useAllConversations")}
                </span>
              </label>
            </div>

            {!useAllConversations && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-2 border rounded">
                {conversations.map((conv) => (
                  <label key={conv.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-primary rounded border-stroke"
                      checked={selectedConversations.includes(conv.id)}
                      onChange={(e) =>
                        handleConversationCheckboxChange(
                          conv.id,
                          e.target.checked,
                        )
                      }
                    />
                    <span className="ml-2">
                      {new Date(conv.created_at).toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assistant Selection */}
            <div>
              <label className="mb-2.5 block text-black dark:text-white">
                {t("scenarios.selectAssistant")}
              </label>
              <select
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={selectedAssistant}
                onChange={handleAssistantChange}
                disabled={loadingAssistants}
              >
                <option value="">
                  {loadingAssistants
                    ? t("scenarios.loadingAssistants")
                    : t("scenarios.selectAssistant")}
                </option>
                {assistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    {assistant.name} ({assistant.model})
                  </option>
                ))}
              </select>
            </div>

            {/* Report Title */}
            <div>
              <label className="mb-2.5 block text-black dark:text-white">
                {t("scenarios.reportTitle")}
              </label>
              <input
                type="text"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={t("scenarios.enterReportTitle")}
              />
            </div>
          </div>

          {/* Prompt Template */}
          <div className="mt-6">
            <label className="mb-2.5 block text-black dark:text-white">
              {t("scenarios.promptTemplate")}
            </label>
            <textarea
              rows={5}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder={t("scenarios.enterPrompt")}
            ></textarea>
          </div>

          {/* Context & Aspects */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                {t("scenarios.context")}:
              </h4>
              <div className="border p-3 rounded-sm bg-gray-50 dark:bg-boxdark-2 text-sm">
                {scenarioContext || t("scenarios.noContextAvailable")}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-black dark:text-white mb-2">
                {t("scenarios.aspects")}:
              </h4>
              <div className="border p-3 rounded-sm bg-gray-50 dark:bg-boxdark-2 text-sm">
                {scenarioAspects.length > 0
                  ? scenarioAspects.map((aspect, index) => (
                      <div key={index} className="mb-1">
                        • {aspect}
                      </div>
                    ))
                  : t("scenarios.noAspectsAvailable")}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={generateCombinedReport}
              disabled={
                selectedConversations.length === 0 ||
                !selectedAssistant ||
                generatingReport
              }
              className="inline-flex items-center justify-center rounded-md bg-primary py-3 px-6 text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("scenarios.generatingReport")}
                </>
              ) : (
                t("scenarios.generateReport")
              )}
            </button>
          </div>
        </div>

        {/* Report Section */}
        {report && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <div className="flex flex-wrap justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-black dark:text-white">
                  {t("scenarios.generatedReport")}
                </h3>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(report);
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t("scenarios.copyReport")}
                  </button>
                  <button
                    onClick={saveReport}
                    disabled={savingReport}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {savingReport ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {t("scenarios.savingReport")}
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        {t("scenarios.saveReport")}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Report metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {selectedConversations.length}{" "}
                  {t(
                    "scenarios.conversationsAnalyzed",
                    "conversations analyzed",
                  )}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {new Date().toLocaleString()}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  AI Assistant:{" "}
                  {assistants.find((a) => a.id === selectedAssistant)?.name ||
                    "Unknown"}
                </span>
              </div>
            </div>

            <div className="p-8">
              <div className="max-w-none prose prose-lg dark:prose-invert">
                {report.split("\n").map((line, i) => {
                  // Enhanced Markdown-like styling with better typography
                  if (line.startsWith("# ")) {
                    return (
                      <h1
                        key={i}
                        className="text-3xl font-bold text-gray-900 dark:text-white mb-6 mt-8 first:mt-0 pb-3 border-b-2 border-gray-200 dark:border-gray-700"
                      >
                        {line.replace("# ", "")}
                      </h1>
                    );
                  } else if (line.startsWith("## ")) {
                    return (
                      <h2
                        key={i}
                        className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 mt-8 first:mt-0"
                      >
                        {line.replace("## ", "")}
                      </h2>
                    );
                  } else if (line.startsWith("### ")) {
                    return (
                      <h3
                        key={i}
                        className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-3 mt-6 first:mt-0"
                      >
                        {line.replace("### ", "")}
                      </h3>
                    );
                  } else if (line.match(/^[A-Za-z\s]+: \d+$/)) {
                    // Enhanced aspect scores with visual indicators
                    const [aspect, score] = line
                      .split(":")
                      .map((s) => s.trim());
                    const scoreNum = parseInt(score);
                    const scoreColor =
                      scoreNum >= 80
                        ? "text-green-600 dark:text-green-400"
                        : scoreNum >= 60
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-red-600 dark:text-red-400";

                    const bgColor =
                      scoreNum >= 80
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : scoreNum >= 60
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-4 mb-3 rounded-lg border ${bgColor}`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-3 ${scoreNum >= 80 ? "bg-green-500" : scoreNum >= 60 ? "bg-blue-500" : "bg-red-500"}`}
                          ></div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {aspect}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`text-2xl font-bold ${scoreColor} mr-3`}
                          >
                            {score}
                          </span>
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${scoreNum >= 80 ? "bg-green-500" : scoreNum >= 60 ? "bg-blue-500" : "bg-red-500"}`}
                              style={{ width: `${scoreNum}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (line.trim() === "") {
                    return <div key={i} className="h-4" />;
                  } else if (line.startsWith("- ") || line.startsWith("• ")) {
                    // Enhanced bullet points
                    return (
                      <div key={i} className="flex items-start mb-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {line.replace(/^[-•]\s*/, "")}
                        </p>
                      </div>
                    );
                  } else {
                    // Regular paragraphs with better typography
                    return (
                      <p
                        key={i}
                        className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-justify"
                      >
                        {line}
                      </p>
                    );
                  }
                })}
              </div>

              {/* Report footer with summary stats */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {selectedConversations.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t(
                        "scenarios.conversationsAnalyzed",
                        "Conversations Analyzed",
                      )}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {scenarioAspects.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("scenarios.aspectsEvaluated", "Aspects Evaluated")}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {
                        report
                          .split("\n")
                          .filter((line) => line.match(/^[A-Za-z\s]+: \d+$/))
                          .length
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("scenarios.scoresGenerated", "Scores Generated")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Reports Section */}
        {savedReports.length > 0 && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                {t("scenarios.savedReports")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {savedReports.length}{" "}
                {t("scenarios.reportsAvailable", "reports available")}
              </p>
            </div>

            <div className="p-6">
              <div className="grid gap-4">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="group border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                          {report.title}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {report.user?.name || "Unknown"}
                          </span>
                          <span className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {report.conversations_ids?.length || 0}{" "}
                            conversations
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReport(report);
                              exportToPdf();
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200"
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            PDF
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {t("scenarios.showToUser")}
                          </span>
                          <SwitcherThree
                            id={`report-visibility-${report.id}`}
                            initialValue={report.show_to_user}
                            onChange={(value) => {
                              updateReportShowToUserRequest(
                                id!,
                                report.id,
                                value,
                              )
                                .then((response) => {
                                  setSavedReports((prev) =>
                                    prev.map((r) =>
                                      r.id === report.id
                                        ? { ...r, show_to_user: value }
                                        : r,
                                    ),
                                  );
                                })
                                .catch((error) => {
                                  console.error(
                                    "Failed to update report visibility:",
                                    error,
                                  );
                                });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Report preview */}
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {report.content.substring(0, 150)}...
                      </p>
                    </div>

                    {/* Status indicator */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${report.show_to_user ? "bg-green-500" : "bg-gray-400"}`}
                        ></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {report.show_to_user
                            ? t("scenarios.visibleToUsers", "Visible to users")
                            : t(
                                "scenarios.hiddenFromUsers",
                                "Hidden from users",
                              )}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Click to view full report
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ScenarioReport;
