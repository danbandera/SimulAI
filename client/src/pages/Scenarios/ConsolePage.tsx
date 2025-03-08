import { useEffect, useRef, useCallback, useState } from "react";
import { instructions } from "../../utils/conversation_config";
import { X, Zap } from "react-feather";
import { Button } from "../../components/button/Button";
import "./ConsolePage.scss";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { useParams } from "react-router-dom";
import axios from "../../config/axios";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface ConsolePageProps {
  aspects: string;
  description: string;
}

interface ConversationItem {
  role: string;
  message: string;
}

export const ConsolePage: React.FC<ConsolePageProps> = ({
  aspects,
  description,
}) => {
  const { t } = useTranslation();
  const { id: scenarioId } = useParams();
  const { currentUser } = useUsers();
  const { saveConversation } = useScenarios();
  const newInstructions =
    instructions + `\n\n${description}` + `\n\n${aspects}`;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startConversation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      setIsConnected(true);
      // setItems([
      //   { role: "user", message: "¡Hola! Inicia con el entrenamiento" },
      // ]);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error(
        "Error starting conversation. Please check microphone access.",
      );
      setIsConnected(false);
    }
  }, []);

  const endConversation = useCallback(async () => {
    try {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsConnected(false);
      setItems([]);
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast.error("Error ending conversation");
    }
  }, []);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      mediaRecorderRef.current?.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Error starting recording");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || isProcessing) return;

    setIsProcessing(true);
    try {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);

      // Wait for the final chunk
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });

      // Create blob from chunks
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

      // Verify that we have a valid audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("No audio data recorded");
      }

      // Create form data with the audio blob
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Send audio to backend for processing
      const response = await axios.post(
        `/scenarios/${scenarioId}/process-audio`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
          maxContentLength: 10 * 1024 * 1024, // 10MB
        },
      );

      // Add user's transcribed message to conversation
      setItems((prevItems) => [
        ...prevItems,
        { role: "user", message: response.data.transcription },
      ]);

      // Add assistant's response to conversation
      setItems((prevItems) => [
        ...prevItems,
        { role: "assistant", message: response.data.response },
      ]);

      // Play the audio response
      if (audioRef.current && response.data.audioUrl) {
        try {
          const audioUrl = response.data.audioUrl.startsWith("http")
            ? response.data.audioUrl
            : new URL(
                response.data.audioUrl,
                axios.defaults.baseURL,
              ).toString();

          console.log("Playing audio from:", audioUrl);

          // Validate that the audio URL exists
          const checkResponse = await fetch(audioUrl, { method: "HEAD" });
          if (!checkResponse.ok) {
            throw new Error(`Audio file not found: ${checkResponse.status}`);
          }

          // Create a new Audio element
          const audio = new Audio();

          // Add event listeners for debugging
          audio.addEventListener("loadstart", () => {
            console.log("Audio loading started");
          });

          audio.addEventListener("loadedmetadata", () => {
            console.log("Audio metadata loaded:", {
              duration: audio.duration,
            });
          });

          audio.addEventListener("canplay", () => {
            console.log("Audio can play");
          });

          audio.addEventListener("error", (e) => {
            console.error("Audio loading error:", {
              error: e,
              code: audio.error?.code,
              message: audio.error?.message,
            });
            toast.error(
              `Error loading audio: ${audio.error?.message || "Unknown error"}`,
            );
          });

          // Wait for the audio to be loaded before playing
          audio.addEventListener("canplaythrough", async () => {
            try {
              console.log("Audio ready to play");
              await audio.play();
            } catch (error) {
              console.error("Error playing audio:", error);
              toast.error("Error playing audio response");
            }
          });

          // Set audio source and load
          audio.src = audioUrl;
          audio.load();
        } catch (error) {
          console.error("Error setting up audio playback:", error);
          toast.error("Error playing audio response");
        }
      }
    } catch (error: any) {
      console.error("Error processing audio:", error);
      toast.error(error?.message || "Error processing audio");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Request microphone permission on component mount
    navigator.mediaDevices.getUserMedia({ audio: true }).catch((error) => {
      console.error("Error requesting microphone permission:", error);
      toast.error("Please grant microphone access to use this feature");
    });

    return () => {
      // Cleanup: stop recording and release media stream
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  return (
    <div data-component="ConsolePage">
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block conversation">
            <div className="content-block-title">
              {t("console.conversation")}
            </div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && t("console.awaitingConnection")}
              {items.map((item, index) => (
                <div className="conversation-item" key={index}>
                  <div className={`speaker ${item.role}`}>
                    <div>
                      {item.role.charAt(0).toUpperCase() + item.role.slice(1)}:
                    </div>
                  </div>
                  <div className="speaker-content">
                    <div>{item.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="content-actions">
            <div className="spacer" />
            {isConnected && (
              <Button
                label={
                  isProcessing
                    ? t("console.processing")
                    : isRecording
                      ? t("console.releaseToSend")
                      : t("console.pushToTalk")
                }
                buttonStyle={isRecording ? "alert" : "regular"}
                disabled={!isConnected || isProcessing}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={
                isConnected
                  ? t("console.endConversation")
                  : t("console.startConversation")
              }
              iconPosition={isConnected ? "end" : "start"}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? "regular" : "action"}
              onClick={
                isConnected
                  ? async () => {
                      // Save the conversation before ending
                      if (scenarioId && currentUser?.id) {
                        await saveConversation(
                          Number(scenarioId),
                          items,
                          currentUser.id,
                        );
                      }
                      endConversation();
                    }
                  : startConversation
              }
            />
          </div>
        </div>
      </div>
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
};
