import { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
  type StartAvatarResponse,
} from "@heygen/streaming-avatar";
// import { AVATARS } from "../../constants/avatars";
import { setupChromaKey } from "./chromaKey";
import { useScenarios } from "../../context/ScenarioContext";
import ScenarioDetail from "../../pages/Scenarios/ScenarioDetail";
import { useAuth } from "../../context/AuthContext";
import * as faceapi from "face-api.js";
import { useTranslation } from "react-i18next";

interface Message {
  type: "user" | "avatar";
  text: string;
  timestamp: Date;
}

interface InteractiveAvatarProps {
  scenarioId: number;
  scenarioTitle: string;
}
const InteractiveAvatar: React.FC<InteractiveAvatarProps> = (props) => {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  // const [avatarId, setAvatarId] = useState<string>(AVATARS[0].avatar_id);
  // const [language, setLanguage] = useState<string>("en");
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { saveConversation } = useScenarios();

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

  // Face Detection component modify later
  const FaceDetection = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const loadModels = async () => {
        try {
          const MODEL_URL =
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          ]);
          startVideo();
        } catch (error) {
          console.error("Error loading models:", error);
        }
      };

      const startVideo = () => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.error("Error accessing camera:", err);
          });
      };

      loadModels();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, []);

    useEffect(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      video.addEventListener("play", () => {
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        const interval = setInterval(async () => {
          const detections = await faceapi
            .detectSingleFace(video)
            .withFaceExpressions();

          if (detections) {
            const resizedDetections = faceapi.resizeResults(
              detections,
              displaySize,
            );
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
            }
          }
        }, 100);

        return () => clearInterval(interval);
      });
    }, []);

    return (
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          width="320"
          height="240"
          className="rounded-lg"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          width="320"
          height="240"
        />
      </div>
    );
  };

  // get scenarioId from InteractiveAvatarProps
  const { scenarioId } = props;

  const mediaStream = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const { getScenario } = useScenarios();
  const { loadSettings } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => {
    const loadScenario = async () => {
      try {
        const data = await getScenario(scenarioId);
        setScenario(data as unknown as ScenarioDetail);
      } catch (error) {
        console.error("Error loading scenario:", error);
      }
    };
    loadScenario();
  }, [scenarioId, getScenario]);

  useEffect(() => {
    const loadSettingsFn = async () => {
      const settings = await loadSettings();
      setSettings(settings);
    };
    loadSettingsFn();
  }, [loadSettings]);
  // console.log(settings?.promt_for_virtual_avatar);

  const knowledgeBase = settings?.promt_for_virtual_avatar.replace(
    "CONTEXT_FOR_PERSONA",
    scenario?.context || "",
  );

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
      return data.data.token;
    } catch (error) {
      console.error("Error retrieving access token:", error);
      throw new Error("Failed to retrieve access token");
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    setConversationHistory([]);

    try {
      const token = await getAccessToken();
      console.log("token", token);
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
    setIsSavingConversation(true);

    // Save conversation history to database if there are messages
    if (conversationHistory.length > 0 && user?.id) {
      try {
        console.log("Conversation history to save:", conversationHistory);

        // Format the conversation history for the API
        const formattedConversation = conversationHistory.map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          message: msg.text,
        }));

        console.log("Formatted conversation:", formattedConversation);

        // Save to database
        await saveConversation(
          props.scenarioId,
          formattedConversation,
          user.id,
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

    // Show conversation history
    // setShowConversation(true);
    console.log("Conversation History:", conversationHistory);
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
      };
    }
  }, [stream]);

  // Setup chroma key when stream is available
  useEffect(() => {
    if (!mediaStream.current || !canvasRef.current) return;

    // Stop any existing chroma key processing
    if (stopChromaKeyProcessing) {
      stopChromaKeyProcessing();
      setStopChromaKeyProcessing(null);
    }

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
  }, [mediaStream.current, canvasRef.current]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  return (
    <div className="w-full h-[500px] bg-gray-100 dark:bg-boxdark-2 rounded-lg overflow-hidden relative">
      <div className="w-full h-full flex justify-center items-center">
        {!stream ? (
          <button
            onClick={startSession}
            disabled={isLoadingSession}
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
          >
            {isLoadingSession
              ? t("scenarios.startSession")
              : t("scenarios.startSession")}
          </button>
        ) : (
          <div className="relative w-full h-full" ref={containerRef}>
            {/* <div className="absolute bottom-0 right-0 z-9">
              <FaceDetection />
            </div> */}
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
            {scenario?.generated_image_url && scenario?.show_image_prompt && (
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  backgroundImage: `url(${scenario.generated_image_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
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
  );
};

export default InteractiveAvatar;
