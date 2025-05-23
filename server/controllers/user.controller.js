import { connectSqlDB } from "../db.cjs";
// const { connectSqlDB } = pkg;
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";
import { parse } from "csv-parse/sync";

export const getUsers = async (req, res) => {
  try {
    const result = await connectSqlDB.from("users").select();
    res.json(result.data);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB
      .from("users")
      .select()
      .eq("id", id)
      .single();

    if (result.data.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, lastname, department, role, email, password, created_by } =
      req.body;
    console.log("Create User:", req.body);
    // Check for existing user with better error handling
    const { data: existingUser, error: searchError } = await connectSqlDB
      .from("users")
      .select()
      .eq("email", email)
      .maybeSingle();

    if (searchError) {
      console.error("Error checking existing user:", searchError);
      return res.status(500).json({ message: "Error checking user existence" });
    }

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with better error handling
    const { data: newUser, error: insertError } = await connectSqlDB
      .from("users")
      .insert({
        name,
        lastname,
        department,
        role,
        email,
        password: hashedPassword,
        created_by,
        profile_image: "",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting user:", insertError);
      return res.status(500).json({ message: "Error creating user" });
    }

    // Create access token after successful user creation
    const accessToken = await createAccessToken({ id: newUser.id });
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return success response
    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({
      message: "Internal server error while creating user",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lastname, department, role, email, password, created_by } =
      req.body;
    const updateData = {
      name,
      lastname,
      department,
      role,
      email,
      profile_image: "",
      created_by,
    };

    // Handle profile image upload if file is present
    if (req.file) {
      const fileUrl = await uploadToS3(req.file, "avatares");
      updateData.profile_image = fileUrl;

      // Delete old profile image if exists
      const oldUser = await connectSqlDB
        .from("users")
        .select("profile_image")
        .eq("id", id)
        .single();

      if (oldUser.data?.profile_image) {
        await deleteFromS3(oldUser.data.profile_image);
      }
    }

    // Only update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const result = await connectSqlDB
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (result.error) {
      throw result.error;
    }

    res.json(result.data);
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB.from("users").delete().eq("id", id);
    res.json(result.data);
    // if (result.status === 204) {
    //   // res.status(200).json({ message: "User deleted successfully" });
    // } else {
    //   res.status(400).json({ message: result.error.message });
    // }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    try {
      // Upload to S3
      const fileUrl = await uploadToS3(req.file, "avatares");

      // Get old user data
      const { data: oldUser, error: selectError } = await connectSqlDB
        .from("users")
        .select("profile_image")
        .eq("id", id)
        .single();

      if (selectError) {
        console.error("Error fetching old user:", selectError);
        throw selectError;
      }

      // Delete old image if exists
      if (oldUser?.profile_image) {
        try {
          await deleteFromS3(oldUser.profile_image);
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue even if delete fails
        }
      }

      // Update user with new image URL
      const { data: updatedUser, error: updateError } = await connectSqlDB
        .from("users")
        .update({ profile_image: fileUrl })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        throw updateError;
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({
        message: "Error processing image upload",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Update Profile Image Error:", error);
    res.status(500).json({
      message: "Error updating profile image",
      error: error.message,
    });
  }
};

export const importUsersFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file provided" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const fileContent = req.file.buffer.toString();
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true, // Trim whitespace from values
    });

    const results = {
      success: [],
      skipped: [],
    };

    for (const record of records) {
      try {
        // Skip empty rows
        if (!record.name && !record.lastname && !record.email && !record.role) {
          continue;
        }

        // Check for required fields
        if (!record.name || !record.lastname || !record.email || !record.role) {
          results.skipped.push({
            row: record,
            reason: "Missing required fields",
          });
          continue;
        }

        // Check for existing user
        const { data: existingUser } = await connectSqlDB
          .from("users")
          .select()
          .eq("email", record.email)
          .maybeSingle();

        if (existingUser) {
          results.skipped.push({
            row: record,
            reason: "User with this email already exists",
          });
          continue;
        }

        // Generate random password
        const password = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error: insertError } = await connectSqlDB
          .from("users")
          .insert({
            name: record.name,
            lastname: record.lastname,
            department: record.department || "",
            role: record.role,
            email: record.email,
            password: hashedPassword,
            created_by: req.user.id,
            profile_image: "",
          })
          .select()
          .single();

        if (insertError) {
          results.skipped.push({
            row: record,
            reason: insertError.message,
          });
          continue;
        }

        results.success.push({
          user: newUser,
          password, // Include the generated password in the response
        });
      } catch (error) {
        results.skipped.push({
          row: record,
          reason: error.message,
        });
      }
    }

    res.json({
      message: "Import completed",
      results,
    });
  } catch (error) {
    console.error("Import Users Error:", error);
    res.status(500).json({
      message: "Error importing users",
      error: error.message,
    });
  }
};
