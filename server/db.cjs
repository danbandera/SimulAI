const { createClient } = require("@supabase/supabase-js");

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key in environment variables");
}

// Initialize Supabase client
const connectSqlDB = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: "public",
  },
});

// Test connection and log status
const testConnection = async () => {
  try {
    const { data, error } = await connectSqlDB
      .from("users")
      .select("*")
      .limit(1);
    if (error) throw error;
    console.log("Successfully connected to Supabase");
  } catch (error) {
    console.error("Error connecting to Supabase:", error.message);
  }
};

// Run connection test
testConnection();

// Export the database client
module.exports = { connectSqlDB };
