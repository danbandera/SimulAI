import { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
  type StartAvatarResponse,
} from "@heygen/streaming-avatar";
import { setupChromaKey } from "./chromaKey";
import { useScenarios } from "../../context/ScenarioContext";
import ScenarioDetail from "../../pages/Scenarios/ScenarioDetail";
import { useAuth } from "../../context/AuthContext";
import * as faceapi from "face-api.js";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

interface Message {
  type: "user" | "avatar";
  text: string;
  timestamp: Date;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface InteractiveAvatarProps {
  scenarioId: number;
  scenarioTitle: string;
  currentUser?: User | null; // Use proper User type with null option
  onTimeUpdate?: () => void; // Optional callback to refresh parent time info
}
const InteractiveAvatar: React.FC<InteractiveAvatarProps> = (props) => {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [stream, setStream] = useState<MediaStream>();

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [chatMode, setChatMode] = useState("voice_mode");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const { t } = useTranslation();
  const [stopChromaKeyProcessing, setStopChromaKeyProcessing] = useState<
    (() => void) | null
  >(null);
  // Chroma key is always enabled - no toggle needed

  // Timer related states
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const {
    saveConversation,
    getScenario,
    getScenarioElapsedTime,
    resetScenarioTimer,
  } = useScenarios();
  const [facialExpressions, setFacialExpressions] = useState<any[]>([]);

  // Use the passed currentUser if available, otherwise fall back to user from useAuth
  const activeUser = props.currentUser || user;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // get scenarioId from InteractiveAvatarProps
  const { scenarioId } = props;

  const mediaStream = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const { loadSettings } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [isTimeOver, setIsTimeOver] = useState(false);
  const [hasCheckedTimeStatus, setHasCheckedTimeStatus] = useState(false);

  useEffect(() => {
    const loadScenario = async () => {
      try {
        const data = await getScenario(scenarioId);
        setScenario(data as unknown as ScenarioDetail);

        // Initialize timer with the scenario time limit (converting from minutes to seconds)
        if ("timeLimit" in data && data.timeLimit) {
          setTimeRemaining((data.timeLimit as number) * 60);
        }
      } catch (error) {
        console.error("Error loading scenario:", error);
      }
    };
    loadScenario();
  }, [scenarioId, getScenario]);

  // Check if time is over when component loads
  useEffect(() => {
    const checkTimeStatus = async () => {
      try {
        const timeData = await getScenarioElapsedTime(scenarioId);
        if (timeData.remaining_time <= 0) {
          setIsTimeOver(true);
          toast.error(
            t(
              "scenarios.timeExpired",
              "Your allotted time for this scenario has expired.",
            ),
          );
        } else {
          // Store the remaining time
          setTimeRemaining(timeData.remaining_time);
          // Store the elapsed time
          elapsedTimeRef.current = timeData.total_elapsed_time;
        }
        setHasCheckedTimeStatus(true);
      } catch (error) {
        console.error("Error checking time status:", error);
        setHasCheckedTimeStatus(true); // Still mark as checked even on error
      }
    };

    checkTimeStatus();
  }, [scenarioId, getScenarioElapsedTime, t]);

  useEffect(() => {
    const loadSettingsFn = async () => {
      const settings = await loadSettings();
      setSettings(settings);
    };
    loadSettingsFn();
  }, [loadSettings]);

  const knowledgeBase = settings?.promt_for_virtual_avatar.replace(
    "CONTEXT_FOR_PERSONA",
    scenario?.context || "",
  );

  let sessionStartTime: number;
  let timerInterval: NodeJS.Timeout;

  async function getAccessToken() {
    try {
      if (!settings?.heygen_key) {
        throw new Error("API key is missing from environment variables");
      }

      const res = await fetch(
        `https://api.heygen.com/v1/streaming.create_token`,
        {
          method: "POST",
          headers: {
            "x-api-key": settings?.heygen_key,
          },
        },
      );

      const data = await res.json();
      if (data) {
        sessionStartTime = Date.now();
        timerInterval = setInterval(() => {
          const elapsedTime = Math.floor(
            (Date.now() - sessionStartTime) / 1000,
          );
          console.log(`Elapsed time: ${elapsedTime} seconds`);
        }, 1000);
      }

      return data.data.token;
    } catch (error) {
      console.error("Error retrieving access token:", error);
      throw new Error("Failed to retrieve access token");
    }
  }

  // Timer logic
  const startTimer = () => {
    if (timeRemaining === null || timeRemaining <= 0 || isTimerRunning) return;

    setIsTimerRunning(true);
    setIsConversationActive(true);
    startTimeRef.current = Date.now();
    let updateCounter = 0; // Counter to track when to update parent

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current === null || !scenario?.timeLimit) return;

      // Calculate elapsed time since this session started
      const sessionElapsed = (Date.now() - startTimeRef.current) / 1000;

      // Calculate total elapsed time (previous sessions + current session)
      const totalElapsed = elapsedTimeRef.current + sessionElapsed;

      // Calculate remaining time based on the scenario's total time limit
      const totalTimeInSeconds = (scenario.timeLimit as number) * 60;
      const newTimeRemaining = Math.max(0, totalTimeInSeconds - totalElapsed);

      setTimeRemaining(newTimeRemaining);

      // Update parent component every 5 seconds to keep progress bar in sync
      updateCounter++;
      if (updateCounter >= 5 && props.onTimeUpdate) {
        props.onTimeUpdate();
        updateCounter = 0;
      }

      if (newTimeRemaining <= 0) {
        setIsTimeOver(true);
        stopTimer();
        toast.error(
          t(
            "scenarios.timeUp",
            "Time's up! Your conversation will be automatically saved.",
          ),
        );
        endSession();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (startTimeRef.current !== null) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      elapsedTimeRef.current += elapsed;
      startTimeRef.current = null;
    }

    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Function to update chroma key state
  const updateChromaKeyState = () => {
    if (!mediaStream.current || !canvasRef.current || !stream) return;

    // Stop any existing chroma key processing
    if (stopChromaKeyProcessing) {
      stopChromaKeyProcessing();
      setStopChromaKeyProcessing(null);
    }

    // Always enable chroma key - show canvas, hide video
    if (canvasRef.current) canvasRef.current.style.display = "block";
    if (mediaStream.current) mediaStream.current.style.display = "none";

    // Start chroma key processing
    const stopProcessing = setupChromaKey(
      mediaStream.current,
      canvasRef.current,
      {
        minHue: 60,
        maxHue: 180,
        minSaturation: 0.1,
        threshold: 1.0,
      },
    );

    setStopChromaKeyProcessing(() => stopProcessing);
  };

  async function startSession() {
    // Don't allow starting if time is over
    if (isTimeOver) {
      toast.error(
        t(
          "scenarios.noTimeRemaining",
          "No time remaining for this scenario. The time limit has been reached.",
        ),
      );
      return;
    }

    // Don't allow starting if we haven't checked time status yet
    if (!hasCheckedTimeStatus) {
      toast.error(
        t(
          "scenarios.checkingTimeStatus",
          "Please wait while we check your remaining time...",
        ),
      );
      return;
    }

    setIsLoadingSession(true);
    setConversationHistory([]);
    setFacialExpressions([]);

    try {
      // Double-check remaining time before starting to be safe
      const timeData = await getScenarioElapsedTime(scenarioId);
      if (timeData.remaining_time <= 0) {
        setIsTimeOver(true);
        toast.error(
          t(
            "scenarios.noTimeRemaining",
            "No time remaining for this scenario. The time limit has been reached.",
          ),
        );
        setIsLoadingSession(false);
        return;
      }

      // Initialize timer with the remaining time from the API
      setTimeRemaining(timeData.remaining_time);
      // Reset elapsed time to what's already been used
      elapsedTimeRef.current = timeData.total_elapsed_time;

      // Immediately update parent component to sync progress bar
      if (props.onTimeUpdate) {
        props.onTimeUpdate();
      }

      // We'll start the timer only after the avatar is loaded
      // Start loading the avatar
      const token = await getAccessToken();
      avatar.current = new StreamingAvatar({
        token,
        basePath:
          process.env.NEXT_PUBLIC_BASE_API_URL || "https://api.heygen.com",
      });

      // Set up event listeners
      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        endSession();
      });
      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("Stream ready:", event.detail);
        setStream(event.detail);

        // Start the timer only after the avatar is fully loaded and stream is ready
        startTimer();
      });
      avatar.current.on(StreamingEvents.USER_START, () => {
        setIsUserTalking(true);
      });
      avatar.current.on(StreamingEvents.USER_STOP, () => {
        setIsUserTalking(false);
      });

      // Add message collection event listeners
      avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log("Avatar talking:", event);
        if (event && event.detail) {
          const messageText = event.detail.text || event.detail.message || "";
          if (messageText) {
            setConversationHistory((prev) => {
              // Check if this is a new message or continuation of the last avatar message
              const lastMessage =
                prev.length > 0 ? prev[prev.length - 1] : null;
              if (lastMessage && lastMessage.type === "avatar") {
                // Update the last message with combined text
                const updatedMessages = [...prev];
                updatedMessages[prev.length - 1] = {
                  ...lastMessage,
                  text: lastMessage.text + messageText,
                };
                return updatedMessages;
              } else {
                // Add as a new message
                return [
                  ...prev,
                  { type: "avatar", text: messageText, timestamp: new Date() },
                ];
              }
            });
          }
        }
      });

      avatar.current.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log("Avatar end message:", event);
        // End of message - no additional processing needed
      });

      avatar.current.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log("User talking:", event);
        if (event && event.detail) {
          const messageText = event.detail.text || event.detail.message || "";
          if (messageText) {
            setConversationHistory((prev) => {
              // Check if this is a new message or continuation of the last user message
              const lastMessage =
                prev.length > 0 ? prev[prev.length - 1] : null;
              if (lastMessage && lastMessage.type === "user") {
                // Update the last message with combined text
                const updatedMessages = [...prev];
                updatedMessages[prev.length - 1] = {
                  ...lastMessage,
                  text: lastMessage.text + messageText,
                };
                return updatedMessages;
              } else {
                // Add as a new message
                return [
                  ...prev,
                  { type: "user", text: messageText, timestamp: new Date() },
                ];
              }
            });
          }
        }
      });

      avatar.current.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log("User end message:", event);
        // End of message - no additional processing needed
      });

      // Start the avatar session
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: scenario?.interactive_avatar || "",
        knowledgeBase: knowledgeBase,
        voice: {
          rate: 1.2,
          emotion: VoiceEmotion.FRIENDLY,
          elevenlabsSettings: {
            stability: 1,
            similarity_boost: 1,
            style: 1,
            use_speaker_boost: true,
          },
        },
        language: scenario?.avatar_language || "es",
        disableIdleTimeout: true,
      });

      setData(res);
      await avatar.current.startVoiceChat({
        isInputAudioMuted: false,
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function endSession() {
    // Stop the timer when conversation ends
    stopTimer();
    setIsConversationActive(false);

    // Save elapsed time to localStorage
    localStorage.setItem(
      `scenario_${scenarioId}_elapsed_time`,
      elapsedTimeRef.current.toString(),
    );

    setIsSavingConversation(true);

    // Save conversation history to database if there are messages
    if (conversationHistory.length > 0 && activeUser?.id) {
      try {
        console.log("Conversation history to save:", conversationHistory);
        console.log("Facial expressions to save:", facialExpressions);

        // Convert the conversation history to the format expected by the API
        const conversationForApi = conversationHistory.map((message) => ({
          role: message.type === "user" ? "user" : "assistant",
          message: message.text,
        }));

        console.log("Formatted conversation:", conversationForApi);

        // Save the conversation to the database
        await saveConversation(
          scenarioId,
          conversationForApi,
          activeUser?.id,
          facialExpressions,
          elapsedTimeRef.current, // Pass the elapsed time
        );
        console.log("Conversation saved successfully");
      } catch (error) {
        console.error("Error saving conversation:", error);
      }
    }

    // Stop chroma key processing if active
    if (stopChromaKeyProcessing) {
      stopChromaKeyProcessing();
      setStopChromaKeyProcessing(null);
    }

    await avatar.current?.stopAvatar();
    setStream(undefined);
    setIsSavingConversation(false);

    // Update the remaining time to reflect the actual time used
    // This ensures the display shows the correct remaining time after the session
    if (scenario?.timeLimit) {
      const totalTimeInSeconds = (scenario.timeLimit as number) * 60;
      const newTimeRemaining = Math.max(
        0,
        totalTimeInSeconds - elapsedTimeRef.current,
      );
      setTimeRemaining(newTimeRemaining);
    }

    // Call the onTimeUpdate callback if provided
    if (props.onTimeUpdate) {
      props.onTimeUpdate();
    }
  }

  async function handleSpeak() {
    if (!avatar.current || !text) return;

    try {
      await avatar.current.speak({
        text,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      });
    } catch (error) {
      console.error("Error during speech:", error);
    }
  }

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current?.play();
        // Setup chroma key after video is loaded
        updateChromaKeyState();
      };
    }
  }, [stream]);

  // Update chroma key when chromaKeyEnabled changes
  useEffect(() => {
    if (stream) {
      updateChromaKeyState();
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  // Set up window close prevention
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConversationActive) {
        // Save current elapsed time to localStorage for recovery
        if (startTimeRef.current !== null) {
          const currentElapsedTime =
            elapsedTimeRef.current + (Date.now() - startTimeRef.current) / 1000;
          localStorage.setItem(
            `scenario_${scenarioId}_elapsed_time`,
            currentElapsedTime.toString(),
          );
        }

        // Standard way to show a confirmation dialog
        e.preventDefault();
        e.returnValue = t(
          "scenarios.closeWarning",
          "Your conversation is still active. Are you sure you want to leave? Your time will be saved.",
        );
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Check if there's saved elapsed time from a previous session
    const savedElapsedTime = localStorage.getItem(
      `scenario_${scenarioId}_elapsed_time`,
    );
    if (savedElapsedTime) {
      elapsedTimeRef.current = parseFloat(savedElapsedTime);
      // Update the timeRemaining based on the elapsed time
      if (timeRemaining !== null) {
        const newTimeRemaining = Math.max(
          0,
          ((scenario?.timeLimit as number) || 0) * 60 - elapsedTimeRef.current,
        );
        setTimeRemaining(newTimeRemaining);

        if (newTimeRemaining <= 0) {
          toast.error(
            t(
              "scenarios.timeExpired",
              "Your allotted time for this scenario has expired.",
            ),
          );
        }
      }
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isConversationActive, scenarioId, scenario, timeRemaining, t]);

  // Add a function to reset the timer
  const resetTimer = async () => {
    try {
      // Call the server-side API to reset the timer (deletes all conversations)
      await resetScenarioTimer(scenarioId);

      // Clear the timer from localStorage
      localStorage.removeItem(`scenario_${scenarioId}_elapsed_time`);

      // Reset the elapsed time
      elapsedTimeRef.current = 0;

      // Get the original time limit from the scenario
      if (scenario?.timeLimit) {
        setTimeRemaining((scenario.timeLimit as number) * 60);
      }

      // Reset the time over state
      setIsTimeOver(false);

      // Reset the hasCheckedTimeStatus to force a recheck
      setHasCheckedTimeStatus(false);

      toast.success(
        t(
          "scenarios.timerReset",
          "Timer has been reset successfully. All previous conversations have been deleted.",
        ),
      );

      // Recheck time status from server to confirm reset
      try {
        const timeData = await getScenarioElapsedTime(scenarioId);
        setTimeRemaining(timeData.remaining_time);
        elapsedTimeRef.current = timeData.total_elapsed_time;
        setHasCheckedTimeStatus(true);

        if (timeData.remaining_time <= 0) {
          setIsTimeOver(true);
          toast.error(
            t(
              "scenarios.errorResettingTimer",
              "There was an issue resetting the timer. Please contact support.",
            ),
          );
        }
      } catch (recheckError) {
        console.error(
          "Error rechecking time status after reset:",
          recheckError,
        );
        setHasCheckedTimeStatus(true);
      }
    } catch (error) {
      console.error("Error resetting timer:", error);
      toast.error(
        t(
          "scenarios.errorResettingTimer",
          "There was an error resetting the timer.",
        ),
      );
    }
  };

  return (
    <div className="relative flex flex-col items-end" ref={containerRef}>
      {/* Timer display with reset button */}
      <div className="flex flex-row items-end gap-4 mb-4">
        {timeRemaining !== null && (
          <div
            className={`px-4 py-2 rounded-lg ${
              isTimeOver
                ? "bg-red-600 animate-pulse"
                : timeRemaining > 300
                  ? "bg-green-500"
                  : timeRemaining > 60
                    ? "bg-yellow-500"
                    : "bg-red-500 animate-pulse"
            } text-white font-bold`}
          >
            {isTimeOver
              ? t("scenarios.timeExpired", "Time Expired")
              : `${t("scenarios.timeRemaining", "Time Remaining")}: ${formatTime(timeRemaining)}`}
          </div>
        )}

        {/* Only show reset button for admins or instructors */}
        {activeUser?.role === "admin" && (
          <button
            onClick={resetTimer}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("scenarios.resetTimer", "Reset Timer")}
          </button>
        )}
      </div>
      <div className="w-full h-[500px] bg-gray-100 dark:bg-boxdark-2 rounded-lg overflow-hidden relative">
        <div className="w-full h-full flex justify-center items-center">
          {!stream ? (
            <button
              onClick={startSession}
              disabled={isLoadingSession || isTimeOver || !hasCheckedTimeStatus}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
            >
              {isLoadingSession
                ? t("scenarios.startingSession", "Starting session...")
                : isTimeOver
                  ? t("scenarios.timeExpired", "Time expired")
                  : !hasCheckedTimeStatus
                    ? t("scenarios.checkingTime", "Checking time...")
                    : t("scenarios.startSession", "Start session")}
            </button>
          ) : (
            <div className="relative w-full h-full" ref={containerRef}>
              {/* Video element - hidden when chroma key is enabled */}
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>

              {/* Canvas element - always shown with chroma key enabled */}
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  ...(scenario?.generated_image_url &&
                    scenario?.show_image_prompt && {
                      backgroundImage: `url(${scenario.generated_image_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }),
                }}
              />

              <button
                onClick={endSession}
                disabled={isSavingConversation}
                className="px-6 py-2 bg-danger text-white rounded-md hover:bg-opacity-90 absolute bottom-4 left-4 disabled:opacity-50"
              >
                {isSavingConversation
                  ? t("scenarios.savingConversation")
                  : t("scenarios.endSession")}
              </button>
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 z-10"
                title="Toggle Fullscreen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveAvatar;
