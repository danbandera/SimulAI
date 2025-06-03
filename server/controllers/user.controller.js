import { connectSqlDB } from "../db.cjs";
// const { connectSqlDB } = pkg;
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";
import { parse } from "csv-parse/sync";

export const getUsers = async (req, res) => {
  try {
    // Get all users
    const { data: users, error: usersError } = await connectSqlDB
      .from("users")
      .select("*");

    if (usersError) {
      throw usersError;
    }

    // Get user departments for all users
    const usersWithDepartments = await Promise.all(
      users.map(async (user) => {
        const { data: userDepartments, error: deptError } = await connectSqlDB
          .from("user_departments")
          .select("department_id")
          .eq("user_id", user.id);

        if (deptError) {
          console.error("Error fetching user departments:", deptError);
          return { ...user, department_ids: [] };
        }

        return {
          ...user,
          department_ids: userDepartments.map((ud) => ud.department_id),
        };
      })
    );

    res.json(usersWithDepartments);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error: userError } = await connectSqlDB
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user departments
    const { data: userDepartments, error: deptError } = await connectSqlDB
      .from("user_departments")
      .select("department_id")
      .eq("user_id", id);

    if (deptError) {
      console.error("Error fetching user departments:", deptError);
      return res.json({ ...user, department_ids: [] });
    }

    const userWithDepartments = {
      ...user,
      department_ids: userDepartments.map((ud) => ud.department_id),
    };

    res.json(userWithDepartments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const {
      name,
      lastname,
      company_id,
      department_ids,
      role,
      email,
      password,
      created_by,
    } = req.body;
    console.log("Create User:", req.body);

    // Get the creating user's information to enforce company rules
    const { data: creatingUser, error: creatingUserError } = await connectSqlDB
      .from("users")
      .select("role, company_id")
      .eq("id", created_by)
      .single();

    if (creatingUserError) {
      console.error("Error fetching creating user:", creatingUserError);
      return res
        .status(500)
        .json({ message: "Error validating user permissions" });
    }

    let finalCompanyId = company_id;
    let finalRole = role;

    // Enforce company rules for company users
    if (creatingUser.role === "company") {
      finalCompanyId = creatingUser.company_id; // Force same company as creator
      finalRole = "user"; // Company users can only create regular users
    }

    // Validate role assignment - only admins can create company/admin users
    if (
      (finalRole === "company" || finalRole === "admin") &&
      creatingUser.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only administrators can create company or admin users",
      });
    }

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
        company_id: finalCompanyId,
        role: finalRole,
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

    // Insert user departments if provided
    if (department_ids && department_ids.length > 0) {
      const userDepartments = department_ids.map((deptId) => ({
        user_id: newUser.id,
        department_id: deptId,
      }));

      const { error: deptInsertError } = await connectSqlDB
        .from("user_departments")
        .insert(userDepartments);

      if (deptInsertError) {
        console.error("Error inserting user departments:", deptInsertError);
        // Continue even if department insertion fails
      }
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
    const {
      name,
      lastname,
      company_id,
      department_ids,
      role,
      email,
      password,
      created_by,
    } = req.body;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get the updating user's information to enforce company rules
    const { data: updatingUser, error: updatingUserError } = await connectSqlDB
      .from("users")
      .select("role, company_id")
      .eq("id", req.user.id) // Use the authenticated user's ID
      .single();

    if (updatingUserError) {
      console.error("Error fetching updating user:", updatingUserError);
      return res
        .status(500)
        .json({ message: "Error validating user permissions" });
    }

    let finalCompanyId = company_id;
    let finalRole = role;

    // Enforce company rules for company users
    if (updatingUser.role === "company") {
      finalCompanyId = updatingUser.company_id; // Force same company as updater
      finalRole = "user"; // Company users can only manage regular users
    }

    // Validate role assignment - only admins can assign company/admin roles
    if (
      (finalRole === "company" || finalRole === "admin") &&
      updatingUser.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only administrators can assign company or admin roles",
      });
    }

    const updateData = {
      name,
      lastname,
      company_id: finalCompanyId,
      role: finalRole,
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

    // Update user departments
    if (department_ids !== undefined) {
      // First, delete existing user departments
      await connectSqlDB.from("user_departments").delete().eq("user_id", id);

      // Then insert new departments if any
      if (department_ids.length > 0) {
        const userDepartments = department_ids.map((deptId) => ({
          user_id: parseInt(id),
          department_id: deptId,
        }));

        const { error: deptInsertError } = await connectSqlDB
          .from("user_departments")
          .insert(userDepartments);

        if (deptInsertError) {
          console.error("Error updating user departments:", deptInsertError);
          // Continue even if department update fails
        }
      }
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

    // Get the importing user's information to enforce company rules
    const { data: importingUser, error: importingUserError } =
      await connectSqlDB
        .from("users")
        .select("role, company_id")
        .eq("id", req.user.id)
        .single();

    if (importingUserError) {
      console.error("Error fetching importing user:", importingUserError);
      return res
        .status(500)
        .json({ message: "Error validating user permissions" });
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
            reason: "Missing required fields (name, lastname, email, role)",
          });
          continue;
        }

        // Determine company_id and role based on importing user's permissions
        let finalCompanyId = null;
        let finalRole = record.role;

        // Enforce company rules for company users
        if (importingUser.role === "company") {
          finalCompanyId = importingUser.company_id; // Force same company as importer
          finalRole = "user"; // Company users can only import regular users
        } else if (importingUser.role === "admin") {
          // Admin can specify company_id from CSV or leave null
          finalCompanyId = record.company_id
            ? parseInt(record.company_id)
            : null;
          // Admin can import any role
        } else {
          results.skipped.push({
            row: record,
            reason: "Insufficient permissions to import users",
          });
          continue;
        }

        // Validate role assignment - only admins can import company/admin users
        if (
          (finalRole === "company" || finalRole === "admin") &&
          importingUser.role !== "admin"
        ) {
          results.skipped.push({
            row: record,
            reason: "Only administrators can import company or admin users",
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
            company_id: finalCompanyId,
            role: finalRole,
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

        // Handle department_ids if provided (comma-separated string)
        if (record.department_ids && finalCompanyId) {
          try {
            const departmentIds = record.department_ids
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((id) => !isNaN(id));

            if (departmentIds.length > 0) {
              // Verify that departments belong to the assigned company
              const { data: validDepartments } = await connectSqlDB
                .from("departments")
                .select("id")
                .eq("company_id", finalCompanyId)
                .in("id", departmentIds);

              const validDepartmentIds = validDepartments.map(
                (dept) => dept.id
              );

              if (validDepartmentIds.length > 0) {
                const userDepartments = validDepartmentIds.map((deptId) => ({
                  user_id: newUser.id,
                  department_id: deptId,
                }));

                await connectSqlDB
                  .from("user_departments")
                  .insert(userDepartments);
              }

              // Log if some departments were invalid
              if (validDepartmentIds.length !== departmentIds.length) {
                console.warn(
                  `Some departments were invalid for user ${newUser.email}. Valid: ${validDepartmentIds}, Requested: ${departmentIds}`
                );
              }
            }
          } catch (deptError) {
            console.error("Error inserting departments for user:", deptError);
            // Continue even if department insertion fails
          }
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

export const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "No user IDs provided" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get the deleting user's information to enforce permissions
    const { data: deletingUser, error: deletingUserError } = await connectSqlDB
      .from("users")
      .select("role, company_id")
      .eq("id", req.user.id)
      .single();

    if (deletingUserError) {
      console.error("Error fetching deleting user:", deletingUserError);
      return res
        .status(500)
        .json({ message: "Error validating user permissions" });
    }

    // Get users to be deleted to check permissions
    const { data: usersToDelete, error: fetchError } = await connectSqlDB
      .from("users")
      .select("id, created_by, company_id, role")
      .in("id", userIds);

    if (fetchError) {
      console.error("Error fetching users to delete:", fetchError);
      return res.status(500).json({ message: "Error fetching users" });
    }

    // Filter users based on permissions
    const allowedUserIds = [];
    const deniedUsers = [];

    for (const user of usersToDelete) {
      let canDelete = false;

      if (deletingUser.role === "admin") {
        // Admin can delete any user except themselves
        canDelete = user.id !== req.user.id;
      } else if (deletingUser.role === "company") {
        // Company users can only delete users they created in their company
        canDelete =
          user.created_by === req.user.id &&
          user.company_id === deletingUser.company_id &&
          user.role === "user"; // Company users can only delete regular users
      }

      if (canDelete) {
        allowedUserIds.push(user.id);
      } else {
        deniedUsers.push(user);
      }
    }

    if (allowedUserIds.length === 0) {
      return res.status(403).json({
        message:
          "You don't have permission to delete any of the selected users",
      });
    }

    // Delete user departments first (foreign key constraint)
    const { error: deptDeleteError } = await connectSqlDB
      .from("user_departments")
      .delete()
      .in("user_id", allowedUserIds);

    if (deptDeleteError) {
      console.error("Error deleting user departments:", deptDeleteError);
      // Continue with user deletion even if department deletion fails
    }

    // Delete users
    const { error: deleteError } = await connectSqlDB
      .from("users")
      .delete()
      .in("id", allowedUserIds);

    if (deleteError) {
      console.error("Error deleting users:", deleteError);
      return res.status(500).json({ message: "Error deleting users" });
    }

    res.json({
      message: "Bulk delete completed",
      deleted: allowedUserIds.length,
      denied: deniedUsers.length,
      deniedUsers: deniedUsers.map((u) => ({
        id: u.id,
        reason: "Insufficient permissions",
      })),
    });
  } catch (error) {
    console.error("Bulk Delete Users Error:", error);
    res.status(500).json({
      message: "Error deleting users",
      error: error.message,
    });
  }
};
