import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    scenarioId: {
      type: Number,
      required: true,
    },
    userId: {
      type: Number,
      required: true,
    },
    conversation: [
      {
        role: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        audioUrl: {
          type: String,
          required: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Conversation", conversationSchema);
