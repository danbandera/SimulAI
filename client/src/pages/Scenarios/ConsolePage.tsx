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
import { saveConversationRequest } from "../../api/scenarios.api.js";
import { useParams } from "react-router-dom";

const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.VITE_REACT_APP_LOCAL_RELAY_SERVER_URL || "";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export function ConsolePage() {
  const { id: scenarioId } = useParams();
  const { scenarios } = useScenarios();
  const { users } = useUsers();

  // Debug log to see the structure
  console.log("Users data:", users);

  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ""
    : localStorage.getItem("tmp::voice_api_key") || OPENAI_API_KEY || "";
  if (apiKey !== "") {
    localStorage.setItem("tmp::voice_api_key", apiKey);
  }

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

  const resetAPIKey = useCallback(() => {
    const apiKey = OPENAI_API_KEY;
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem("tmp::voice_api_key", apiKey);
      window.location.reload();
    }
  }, []);

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
      { type: "input_text", text: "Hola ¿Como estas?" },
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

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
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
  console.log(scenarioId);
  console.log(users);
  const saveConversation = useCallback(async () => {
    // if (!scenarioId || !userId) {
    //   console.error("Missing scenario or user ID");
    //   return;
    // }

    const conversation = items.map((item) => ({
      role: item.role,
      message: item.formatted.text || item.formatted.transcript,
    }));
    console.log(conversation);
    try {
      const response = await saveConversationRequest(
        parseInt(scenarioId),
        conversation,
        parseInt(users[0].id),
      );

      const result = await response.json();
      console.log("Conversation saved successfully:", result);
    } catch (error) {
      console.error("Error saving conversation:", error);
      // Handle error (maybe show a notification to the user)
    }
  }, [items, scenarioId, users]);

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
              {items.map((conversationItem) => (
                <div className="conversation-item" key={conversationItem.id}>
                  <div className={`speaker ${conversationItem.role || ""}`}>
                    <div>
                      {(
                        conversationItem.role || conversationItem.type
                      ).replaceAll("_", " ")}
                    </div>
                    <div
                      className="close"
                      onClick={() =>
                        deleteConversationItem(conversationItem.id)
                      }
                    >
                      <X />
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
              labels={["manual", "vad"]}
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
            {items.length > 0 && (
              <Button
                label="Save Conversation"
                onClick={saveConversation}
                buttonStyle="regular"
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
                  ? () => {
                      disconnectConversation();
                      saveConversation();
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
