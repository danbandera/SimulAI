import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    scenarioId: { type: String, required: true },
    conversation: { type: Array, required: true },
    userId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Conversation", conversationSchema);
