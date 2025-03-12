import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { jsPDF } from "jspdf";
import { useTranslation } from "react-i18next";

import fs from "fs";
import { log } from "console";

interface ConversationMessage {
  role: string;
  message: string;
  audioUrl?: string;
}

interface Conversation {
  _id: string;
  scenarioId: number;
  userId: number;
  conversation: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

const ScenarioConversations = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { getConversations } = useScenarios();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [expandedConversations, setExpandedConversations] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const loadConversations = async () => {
      if (id) {
        try {
          const apiData = await getConversations(Number(id));
          console.log("Number(id)", Number(id));
          // Transform API response to match our interface
          const transformedData = apiData.map((conv: any) => ({
            _id: conv._id,
            scenarioId: conv.scenarioId,
            userId: conv.userId,
            conversation: conv.conversation,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt || conv.createdAt,
          }));
          setConversations(transformedData);
        } catch (error) {
          console.error("Error loading conversations:", error);
          // Set empty array on error to avoid undefined state
          setConversations([]);
        }
      }
    };

    loadConversations();
  }, [id, getConversations]);

  const toggleExpand = (convId: string) => {
    setExpandedConversations((prev) => ({
      ...prev,
      [convId]: !prev[convId],
    }));
  };

  const exportAsPDF = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the conversation when clicking export
    const doc = new jsPDF();
    const timestamp = new Date(conv.createdAt).toLocaleString();

    doc.setFontSize(16);
    doc.text(`Conversation Export - ${timestamp}`, 20, 20);

    let yPosition = 40;
    conv.conversation.forEach((msg) => {
      doc.setFontSize(12);
      doc.text(`${msg.role}: ${msg.message}`, 20, yPosition, {
        maxWidth: 170,
      });
      yPosition += 10 + doc.splitTextToSize(msg.message, 170).length * 7;

      if (yPosition >= 280) {
        doc.addPage();
        yPosition = 20;
      }
    });

    doc.save(`conversation-${timestamp}.pdf`);
  };

  const exportAsTXT = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the conversation when clicking export
    const timestamp = new Date(conv.createdAt).toLocaleString();
    let content = `Conversation Export - ${timestamp}\n\n`;

    conv.conversation.forEach((msg) => {
      content += `${msg.role}: ${msg.message}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conversation-${timestamp}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Breadcrumb pageName={t("scenarios.conversationsHistory")} />

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-7.5">
        <div className="flex flex-col gap-5.5">
          {conversations.map((conv) => {
            const isExpanded = expandedConversations[conv._id] || false;
            return (
              <div
                key={conv._id}
                className="border border-stroke p-4 rounded-sm dark:border-strokedark cursor-pointer transition-all"
                onClick={() => toggleExpand(conv._id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(conv.createdAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 text-sm text-white bg-primary rounded hover:bg-opacity-90"
                      onClick={(e) => exportAsPDF(conv, e)}
                    >
                      PDF
                    </button>
                    <button
                      className="px-3 py-1 text-sm text-white bg-primary rounded hover:bg-opacity-90"
                      onClick={(e) => exportAsTXT(conv, e)}
                    >
                      TXT
                    </button>
                    <button className="text-sm text-blue-500">
                      {isExpanded
                        ? t("scenarios.collapse")
                        : t("scenarios.expand")}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-3 mt-2">
                    {conv.conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.role === "assistant"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === "assistant"
                              ? "bg-gray-100 dark:bg-meta-4"
                              : "bg-primary text-white"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          {msg.audioUrl && (
                            <div className="mt-2">
                              <audio controls className="w-full">
                                <source
                                  src={msg.audioUrl}
                                  type={
                                    msg.role === "user"
                                      ? "audio/webm"
                                      : "audio/mpeg"
                                  }
                                />
                                {t("scenarios.audioNotSupported")}
                              </audio>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {conversations.length === 0 && (
            <p className="text-center text-gray-500">
              {t("scenarios.noConversationsFound")}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ScenarioConversations;
