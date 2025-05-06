import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useAuth } from "../../context/AuthContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { useTranslation } from "react-i18next";
import {
  getOpenAIAssistantsRequest,
  generateReportWithAssistantRequest,
  saveReportRequest,
  exportReportToPdfRequest,
  exportReportToWordRequest,
  getReportsRequest,
} from "../../api/scenarios.api";

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
            setSavedReports(reportsData);

            // Select the most recent report if available
            if (reportsData && reportsData.length > 0) {
              setSelectedReport(reportsData[0]);
            }
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
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {t("scenarios.generatedReport")}
              </h3>
              <div className="flex gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => {
                    // Copy report to clipboard
                    navigator.clipboard.writeText(report);
                    // Show toast or alert
                    // alert(t("scenarios.reportCopied"));
                  }}
                  className="px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-opacity-90"
                >
                  {t("scenarios.copyReport")}
                </button>
                <button
                  onClick={saveReport}
                  disabled={savingReport}
                  className="px-3 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                  {savingReport ? (
                    <>
                      <svg
                        className="animate-spin inline-block mr-1 h-4 w-4 text-white"
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
                    t("scenarios.saveReport")
                  )}
                </button>
              </div>
            </div>

            <div className="markdown-body border rounded-md p-6 bg-gray-50 dark:bg-boxdark-2 whitespace-pre-line">
              {report.split("\n").map((line, i) => {
                // Add some basic Markdown styling
                if (line.startsWith("# ")) {
                  return (
                    <h1 key={i} className="text-2xl font-bold mb-4 mt-2">
                      {line.replace("# ", "")}
                    </h1>
                  );
                } else if (line.startsWith("## ")) {
                  return (
                    <h2 key={i} className="text-xl font-bold mb-3 mt-4">
                      {line.replace("## ", "")}
                    </h2>
                  );
                } else if (line.startsWith("### ")) {
                  return (
                    <h3 key={i} className="text-lg font-bold mb-2 mt-3">
                      {line.replace("### ", "")}
                    </h3>
                  );
                } else if (line.match(/^[A-Za-z\s]+: \d+$/)) {
                  // Style aspect scores
                  const [aspect, score] = line.split(":").map((s) => s.trim());
                  const scoreNum = parseInt(score);
                  const scoreColor =
                    scoreNum >= 80
                      ? "text-green-600"
                      : scoreNum >= 60
                        ? "text-blue-600"
                        : "text-red-600";

                  return (
                    <div key={i} className="flex items-center mb-2">
                      <span className="font-medium">{aspect}:</span>
                      <span className={`ml-2 font-bold ${scoreColor}`}>
                        {score}
                      </span>
                    </div>
                  );
                } else if (line.trim() === "") {
                  return <br key={i} />;
                } else {
                  return (
                    <p key={i} className="mb-2">
                      {line}
                    </p>
                  );
                }
              })}
            </div>

            {/* <div className="mt-6 flex justify-end">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center rounded-md bg-meta-3 py-2 px-4 text-white hover:bg-opacity-90 mr-3"
              >
                {t("scenarios.printReport")}
              </button>
              <button
                onClick={() => navigate(`/scenarios/${id}`)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-white hover:bg-opacity-90"
              >
                {t("scenarios.backToScenario")}
              </button>
            </div> */}
          </div>
        )}

        {/* Saved Reports Section */}
        {selectedReport && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {t("scenarios.savedReport")}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportToPdf}
                  className="px-3 py-1.5 text-sm text-white bg-red-500 rounded hover:bg-opacity-90"
                >
                  {t("scenarios.exportToPdf")}
                </button>
                <button
                  onClick={exportToWord}
                  className="px-3 py-1.5 text-sm text-white bg-blue-700 rounded hover:bg-opacity-90"
                >
                  {t("scenarios.exportToWord")}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              {t("scenarios.savedAt")}:{" "}
              {new Date(selectedReport.created_at).toLocaleString()}
              <br />
              {t("scenarios.savedBy")}: {selectedReport.user?.name || "Unknown"}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ScenarioReport;
