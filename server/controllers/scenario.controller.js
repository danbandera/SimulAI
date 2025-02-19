import { db } from "../db.cjs";

export const getScenarios = async (req, res) => {
  try {
    const result = await db.from("scenarios").select(`
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_user:user_id_created (
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
    const result = await db
      .from("scenarios")
      .select(
        `
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_user:user_id_created (
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
    const result = await db.from("scenarios").select().eq("user_id", id);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createScenario = async (req, res) => {
  try {
    const { title, description, user, parent_scenario } = req.body;

    // Start a Supabase transaction
    const { data: scenario, error: scenarioError } = await db
      .from("scenarios")
      .insert({
        title,
        description,
        status: "draft",
        user_id_assigned: user,
        user_id_created: user,
        parent_scenario: parent_scenario,
      })
      .select(
        `
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_user:user_id_created (
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
    const { data: scenario, error: scenarioError } = await db
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
    const result = await db.from("scenarios").delete().eq("id", id);

    if (result.error) {
      return res.status(400).json({ message: result.error.message });
    }
    res.json({ message: "Scenario deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
