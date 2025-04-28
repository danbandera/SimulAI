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
  const [stopChromaKeyProcessing, setStopChromaKeyProcessing] = useState<
    (() => void) | null
  >(null);

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
    // Stop chroma key processing if active
    if (stopChromaKeyProcessing) {
      stopChromaKeyProcessing();
      setStopChromaKeyProcessing(null);
    }

    await avatar.current?.stopAvatar();
    setStream(undefined);
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
            {isLoadingSession ? "Starting..." : "Start Session"}
          </button>
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={mediaStream}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                // display: "none", // Hide the video element
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
          </div>
        )}
      </div>

      {stream && (
        <div className="absolute bottom-4 left-4 right-4 flex gap-4 items-center">
          {/* <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-md bg-white dark:bg-boxdark border border-stroke"
          />
          <button
            onClick={handleSpeak}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
          >
            Speak
          </button> */}
          <button
            onClick={endSession}
            className="px-6 py-2 bg-danger text-white rounded-md hover:bg-opacity-90"
          >
            End Session
          </button>
        </div>
      )}
    </div>
  );
};

export default InteractiveAvatar;
