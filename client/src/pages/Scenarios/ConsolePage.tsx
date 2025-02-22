import { useEffect, useRef, useCallback, useState } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { WavRecorder, WavStreamPlayer } from "../../lib/wavtools/index.js";
import { instructions } from "../../utils/conversation_config";
import { X, Edit, Zap } from "react-feather";
import { Button } from "../../components/button/Button";
import { Toggle } from "../../components/toggle/Toggle";
import "./ConsolePage.scss";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { useParams } from "react-router-dom";

const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.VITE_REACT_APP_LOCAL_RELAY_SERVER_URL || "";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const calculateSpeakingTime = (text: string): number => {
  const wordsPerSecond = 2; // Average speaking rate
  const wordCount = text.split(" ").length;
  return (wordCount / wordsPerSecond) * 1000; // Convert to milliseconds
};

export function ConsolePage() {
  const { id: scenarioId } = useParams();
  const { currentUser } = useUsers();
  const { saveConversation } = useScenarios();
  const apiKey = LOCAL_RELAY_SERVER_URL ? "" : OPENAI_API_KEY || "";

  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 }),
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 }),
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          },
    ),
  );

  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    setIsConnected(true);
    setItems(client.conversation.getItems());

    await wavRecorder.begin();
    await wavStreamPlayer.connect();
    await client.connect();

    client.sendUserMessageContent([
      { type: "input_text", text: "¡Hola! Inicia con el entrenamiento" },
    ]);

    if (client.getTurnDetectionType() === "server_vad") {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const startRecording = async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (wavRecorder.getStatus() === "recording") {
      await wavRecorder.pause();
    }

    setIsRecording(true);
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;

    if (wavRecorder.getStatus() === "recording") {
      await wavRecorder.pause();
    }

    client.createResponse();
  };

  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === "none" && wavRecorder.getStatus() === "recording") {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === "none" ? null : { type: "server_vad" },
    });
    if (value === "server_vad" && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === "none");
  };

  useEffect(() => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    client.updateSession({ instructions: instructions });
    client.updateSession({ input_audio_transcription: { model: "whisper-1" } });

    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });

    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === "completed" && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000,
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);

  return (
    <div data-component="ConsolePage">
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block conversation">
            <div className="content-block-title">conversation</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `awaiting connection...`}
              {items
                .filter(
                  (item) =>
                    !(
                      item.role === "user" &&
                      (item.formatted.text ===
                        "Please analyze the emotions I displayed during this conversation and provide a summary. REMEMER: Only this conversation, not the previous ones. Say it in Spanish." ||
                        item.formatted.text ===
                          "¡Hola! Inicia con el entrenamiento")
                    ),
                )
                .map((conversationItem) => (
                  <div className="conversation-item" key={conversationItem.id}>
                    <div className={`speaker ${conversationItem.role || ""}`}>
                      <div>
                        {(
                          conversationItem.role || conversationItem.type
                        ).replaceAll("_", " ")}
                      </div>
                    </div>
                    <div className={`speaker-content`}>
                      {conversationItem.role === "user" && (
                        <div>
                          User:{" "}
                          {conversationItem.formatted.text ||
                            conversationItem.formatted.transcript}
                        </div>
                      )}
                      {conversationItem.role === "assistant" && (
                        <div>
                          Assistant:{" "}
                          {conversationItem.formatted.text ||
                            conversationItem.formatted.transcript}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={["manual", "automatic"]}
              values={["none", "server_vad"]}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? "release to send" : "push to talk"}
                buttonStyle={isRecording ? "alert" : "regular"}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? "End Conversation" : "Start Conversation"}
              iconPosition={isConnected ? "end" : "start"}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? "regular" : "action"}
              onClick={
                isConnected
                  ? async () => {
                      const client = clientRef.current;
                      const analysisPrompt =
                        "Please analyze the emotions I displayed during this conversation and provide a summary. REMEMER: Only this conversation, not the previous ones. Say it in Spanish.";

                      console.log("Sending analysis prompt...");

                      client.sendUserMessageContent([
                        {
                          type: "input_text",
                          text: analysisPrompt,
                        },
                      ]);

                      // Wait for the analysis response
                      const checkForAnalysis = async () => {
                        const latestItems = client.conversation.getItems();
                        console.log("Checking for analysis response...");

                        // Get the last assistant message after our analysis prompt
                        const analysisPromptIndex = latestItems.findIndex(
                          (item) =>
                            item.role === "user" &&
                            item.formatted.text === analysisPrompt,
                        );

                        const lastAssistantMessage = latestItems
                          .slice(analysisPromptIndex)
                          .reverse()
                          .find(
                            (item) =>
                              item.role === "assistant" &&
                              item.status === "completed", // Make sure the message is completed
                          );

                        console.log(
                          "Last assistant message:",
                          lastAssistantMessage,
                        );

                        if (
                          lastAssistantMessage?.status === "completed" &&
                          (lastAssistantMessage.formatted?.transcript ||
                            lastAssistantMessage.formatted?.text)
                        ) {
                          const responseText =
                            lastAssistantMessage.formatted.transcript ||
                            lastAssistantMessage.formatted.text ||
                            "";

                          console.log("Response text:", responseText);

                          const waitTime = calculateSpeakingTime(responseText);
                          console.log(
                            "Found response, waiting for:",
                            waitTime,
                            "ms",
                          );

                          await new Promise((resolve) =>
                            setTimeout(resolve, waitTime),
                          );

                          // Filter out the analysis prompt and include the response
                          const conversationData = latestItems
                            .filter(
                              (item) =>
                                !(
                                  item.role === "user" &&
                                  item.formatted.text === analysisPrompt
                                ),
                            )
                            .map((item) => ({
                              role: item.role,
                              message:
                                item.formatted.text ||
                                item.formatted.transcript,
                            }));

                          console.log("Saving conversation...");
                          if (scenarioId && currentUser?.id) {
                            await saveConversation(
                              Number(scenarioId),
                              conversationData,
                              currentUser?.id,
                            );
                          }
                          disconnectConversation();
                        } else {
                          // Check again in 500ms
                          console.log(
                            "No completed response yet, checking again in 500ms",
                          );
                          setTimeout(checkForAnalysis, 500);
                        }
                      };

                      // Start checking after a small delay to allow the message to be sent
                      setTimeout(checkForAnalysis, 1000);
                    }
                  : connectConversation
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
