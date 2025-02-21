import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";

interface ConversationMessage {
  role: string;
  message: string;
}

interface ConversationData {
  id: number;
  scenario_id: number;
  user_id: number;
  conversation: ConversationMessage[];
  created_at: string;
}

const ScenarioConversations = () => {
  const { id } = useParams();
  const { getConversations } = useScenarios();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [expandedConversations, setExpandedConversations] = useState<{
    [key: number]: boolean;
  }>({});

  useEffect(() => {
    const loadConversations = async () => {
      if (id) {
        try {
          const data = await getConversations(Number(id));
          setConversations(data);
        } catch (error) {
          console.error("Error loading conversations:", error);
        }
      }
    };

    loadConversations();
  }, [id, getConversations]);

  const toggleExpand = (convId: number) => {
    setExpandedConversations((prev) => ({
      ...prev,
      [convId]: !prev[convId],
    }));
  };

  return (
    <>
      <Breadcrumb pageName="Conversations History" />

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-7.5">
        <div className="flex flex-col gap-5.5">
          {conversations.map((conv) => {
            const isExpanded = expandedConversations[conv._id] || false;
            console.log(conv._id);
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
                  <button className="text-sm text-blue-500">
                    {isExpanded ? "Collapse" : "Expand"}
                  </button>
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
              No conversations found for this scenario
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ScenarioConversations;
