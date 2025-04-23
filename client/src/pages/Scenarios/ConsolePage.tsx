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
  context: string;
}

interface ConversationItem {
  role: string;
  message: string;
  audioUrl?: string;
  hidden?: boolean;
}

export const ConsolePage: React.FC<ConsolePageProps> = ({
  aspects,
  context,
}) => {
  const { t } = useTranslation();
  const { id: scenarioId } = useParams();
  const { currentUser } = useUsers();
  const { saveConversation } = useScenarios();
  const newInstructions = instructions + `\n\n${context}` + `\n\n${aspects}`;

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

      // First, get the evaluation from the AI (not visible to the user)
      if (scenarioId && currentUser?.id) {
        try {
          console.log("Sending final evaluation message...");
          const finalMessage =
            "Give a score for each aspect from 0 to 100 at the end of the conversation. Example: Aspect 1: 80, Aspect 2: 70, Aspect 3: 90. Show every aspect score in a new line.";

          const response = await axios.post(
            `/scenarios/${scenarioId}/process-final-message`,
            { message: finalMessage },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 60000, // Increase timeout to 60 seconds
            },
          );

          // Add the evaluation to the conversation items
          if (response.data && response.data.response) {
            console.log(
              "Received evaluation response, adding to conversation...",
            );

            // Add the evaluation message to the items array (hidden from UI)
            const updatedItems = [
              ...items,
              { role: "user", message: finalMessage, hidden: true },
              { role: "assistant", message: response.data.response },
            ];

            // Save the complete conversation with the evaluation
            await saveConversation(
              Number(scenarioId),
              updatedItems,
              currentUser.id,
            );
            console.log("Conversation with evaluation saved successfully");
            toast.success(t("console.conversationSaved"));
          } else {
            console.warn("Received empty response from evaluation endpoint");
            // Save the conversation without evaluation
            if (items.length > 0) {
              await saveConversation(Number(scenarioId), items, currentUser.id);
              toast.success(t("console.conversationSaved"));
            }
          }
        } catch (error: any) {
          // Log detailed error but don't show to user since this is a background operation
          console.error("Error processing final evaluation:", error);

          if (error.response) {
            console.error(
              "Server response:",
              error.response.status,
              error.response.data,
            );
          }

          // Save the conversation without the evaluation
          if (items.length > 0) {
            await saveConversation(Number(scenarioId), items, currentUser.id);
            toast.success(t("console.conversationSaved"));
          }
        }
      } else if (scenarioId && currentUser?.id && items.length > 0) {
        // If we can't get an evaluation, just save the conversation
        await saveConversation(Number(scenarioId), items, currentUser.id);
        toast.success(t("console.conversationSaved"));
      }

      // Clear the conversation display and disconnect
      setIsConnected(false);
      setItems([]);
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast.error(t("console.errorEndingConversation"));
    }
  }, [scenarioId, currentUser, items, saveConversation, t]);

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
        {
          role: "user",
          message: response.data.transcription,
          audioUrl: response.data.userAudioUrl,
        },
      ]);

      // Add assistant's response to conversation
      setItems((prevItems) => [
        ...prevItems,
        {
          role: "assistant",
          message: response.data.response,
          audioUrl: response.data.aiAudioUrl,
        },
      ]);

      // Play the audio response
      if (audioRef.current && response.data.aiAudioUrl) {
        try {
          const audioUrl = response.data.aiAudioUrl.startsWith("http")
            ? response.data.aiAudioUrl
            : new URL(
                response.data.aiAudioUrl,
                axios.defaults.baseURL,
              ).toString();

          // Validate that the audio URL exists
          const checkResponse = await fetch(audioUrl, { method: "HEAD" });
          if (!checkResponse.ok) {
            throw new Error(`Audio file not found: ${checkResponse.status}`);
          }

          // Create a new Audio element
          const audio = new Audio();

          // Add event listeners for debugging
          // audio.addEventListener("loadstart", () => {
          //   console.log("Audio loading started");
          // });

          // audio.addEventListener("loadedmetadata", () => {
          //   console.log("Audio metadata loaded:", {
          //     duration: audio.duration,
          //   });
          // });

          // audio.addEventListener("canplay", () => {
          //   console.log("Audio can play");
          // });

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
              {items.map(
                (item, index) =>
                  !item.hidden && (
                    <div className="conversation-item" key={index}>
                      <div className={`speaker ${item.role}`}>
                        <div>
                          {item.role.charAt(0).toUpperCase() +
                            item.role.slice(1)}
                          :
                        </div>
                      </div>
                      <div className="speaker-content">
                        <div>{item.message}</div>
                      </div>
                    </div>
                  ),
              )}
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
              onClick={isConnected ? endConversation : startConversation}
            />
          </div>
        </div>
      </div>
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
};
