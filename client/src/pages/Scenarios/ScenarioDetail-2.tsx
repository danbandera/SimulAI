import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { RelayClient } from "../../utils/relay";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Message {
  type: string;
  content: string;
  timestamp: string;
  user?: string;
}

interface ScenarioResponse {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface Scenario extends ScenarioResponse {
  assigned_user: User;
  created_user: User;
}

const ScenarioDetail = () => {
  const { id } = useParams();
  const { getScenario } = useScenarios();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const relayRef = useRef<RelayClient | null>(null);

  useEffect(() => {
    const loadScenario = async () => {
      if (id) {
        try {
          const data = await getScenario(parseInt(id));
          if (data) {
            setScenario(data as unknown as Scenario);
          }
        } catch (error) {
          console.error("Error loading scenario:", error);
        }
      }
    };
    loadScenario();

    const relay = new RelayClient(`scenario-${id}`);
    relayRef.current = relay;

    relay.onMessage((data) => {
      setMessages((prev) => [
        ...prev,
        {
          type: data.type,
          content: data.content,
          timestamp: new Date().toISOString(),
          user: data.user,
        },
      ]);
    });

    return () => {
      relay.disconnect();
    };
  }, [id]);

  const sendMessage = (content: string) => {
    if (relayRef.current?.isConnected()) {
      relayRef.current.send({
        type: "message",
        content,
        scenarioId: id,
        user: scenario?.created_user.name,
      });
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const relay = relayRef.current;
      if (!relay) return;

      console.log("Starting recording...");
      relay.send({
        type: "start_recording",
        scenarioId: id,
      });
    } catch (error) {
      console.error("Recording error:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      const relay = relayRef.current;
      if (!relay) return;

      console.log("Stopping recording...");
      relay.send({
        type: "stop_recording",
        scenarioId: id,
      });
    } catch (error) {
      console.error("Stop recording error:", error);
    }
  };

  if (!scenario) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Breadcrumb pageName={`Scenario: ${scenario.title}`} />

      <div className="grid grid-cols-1 gap-9">
        <div className="flex flex-col gap-9">
          {/* Messages Section */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Messages
              </h3>
            </div>
            <div className="p-6.5">
              <div className="h-96 overflow-y-auto mb-4">
                {messages.map((message, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-black dark:text-white">
                            {message.user || "System"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-black dark:text-white">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Push-to-talk button */}
              <div className="flex justify-center p-4 border-t border-stroke dark:border-strokedark">
                <button
                  className={`flex items-center justify-center rounded-full w-16 h-16 ${
                    isRecording ? "bg-danger" : "bg-primary"
                  } text-white transition-colors duration-200 disabled:opacity-50`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  disabled={!relayRef.current?.isConnected()}
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioDetail;
