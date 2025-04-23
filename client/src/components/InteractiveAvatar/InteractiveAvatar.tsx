import { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
  type StartAvatarResponse,
} from "@heygen/streaming-avatar";
import { getAccessToken } from "../../api/get-access-token";
import { AVATARS, STT_LANGUAGE_LIST } from "../../constants/avatars";
import { setupChromaKey } from "./chromaKey";

interface InteractiveAvatarProps {
  scenarioId: number;
  scenarioTitle: string;
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = () => {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0].avatar_id);
  const [language, setLanguage] = useState<string>("en");
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [chatMode, setChatMode] = useState("voice_mode");
  const [stopChromaKeyProcessing, setStopChromaKeyProcessing] = useState<
    (() => void) | null
  >(null);

  const mediaStream = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  async function startSession() {
    setIsLoadingSession(true);
    try {
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
        avatarName: "Alessandra_Black_Suit_public",
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
        language: "es",
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
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                position: "absolute",
                top: 0,
                left: 0,
                backgroundImage:
                  "url('https://media.istockphoto.com/id/1505366087/es/foto/fondo-borroso-de-una-sala-vac%C3%ADa.jpg?s=612x612&w=0&k=20&c=M6T2f0429_mKDa3tX_pQ_iJ8tM17JzWOeZuPtPqBVeI=')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
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
