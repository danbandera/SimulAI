import { connectSqlDB } from "../db.cjs";
import Conversation from "../models/conversation.model.js";

export const getScenarios = async (req, res) => {
  try {
    const result = await connectSqlDB.from("scenarios").select(`
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_by (
          id,
          name,
          email
        )
      `);
    res.json(result.data);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getScenarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB
      .from("scenarios")
      .select(
        `
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_by (
          id,
          name,
          email
        )
      `
      )
      .eq("id", id)
      .single();

    if (!result.data) {
      return res.status(404).json({ message: "Scenario not found" });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScenarioByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB
      .from("scenarios")
      .select()
      .eq("user_id", id);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createScenario = async (req, res) => {
  try {
    const {
      title,
      description,
      user_id_assigned,
      created_by,
      parent_scenario,
      status,
    } = req.body;

    const { data: scenario, error: scenarioError } = await connectSqlDB
      .from("scenarios")
      .insert({
        title,
        description,
        status,
        user_id_assigned,
        created_by,
        parent_scenario,
      })
      .select(
        `
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_by (
          id,
          name,
          email
        )
      `
      )
      .single();

    if (scenarioError) {
      return res.status(400).json({ message: scenarioError.message });
    }

    res.status(201).json(scenario);
  } catch (error) {
    console.error("Create Scenario Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, user_id, parent_scenario } = req.body;

    // Update scenario details
    const { data: scenario, error: scenarioError } = await connectSqlDB
      .from("scenarios")
      .update({
        title,
        description,
        status,
        user_id,
        parent_scenario,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (scenarioError) {
      return res.status(400).json({ message: scenarioError.message });
    }

    res.json(scenario);
  } catch (error) {
    console.error("Update Scenario Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB.from("scenarios").delete().eq("id", id);

    if (result.error) {
      return res.status(400).json({ message: result.error.message });
    }
    res.json({ message: "Scenario deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveConversation = async (req, res) => {
  try {
    const { scenarioId, conversation, userId } = req.body;

    const conversationToSave = await Conversation.create({
      scenarioId,
      conversation,
      userId,
    });

    console.log(conversationToSave);
    res.status(201).json(conversationToSave);
  } catch (error) {
    console.error("Save Conversation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const conversations = await Conversation.find({ scenarioId });

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({
        message: `No conversations found for scenario ${scenarioId}`,
      });
    }

    res.json(conversations);
  } catch (error) {
    console.error("Get Conversations Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { scenarioId, conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find();

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ message: "No conversations found" });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
