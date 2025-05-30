import { connectSqlDB } from "../db.cjs";

// Get all companies with their departments
export const getCompanies = async (req, res) => {
  try {
    // Get companies
    const { data: companies, error: companiesError } = await connectSqlDB
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (companiesError) {
      throw companiesError;
    }

    // Get departments for each company
    const companiesWithDepartments = await Promise.all(
      companies.map(async (company) => {
        const { data: departments, error: deptError } = await connectSqlDB
          .from("departments")
          .select("*")
          .eq("company_id", company.id);

        if (deptError) {
          console.error("Error fetching departments:", deptError);
          return { ...company, departments: [] };
        }

        return { ...company, departments: departments || [] };
      })
    );

    res.json(companiesWithDepartments);
  } catch (error) {
    console.error("Get Companies Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single company with its departments
export const getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Get company
    const { data: company, error: companyError } = await connectSqlDB
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (companyError) {
      throw companyError;
    }

    // Get departments
    const { data: departments, error: deptError } = await connectSqlDB
      .from("departments")
      .select("*")
      .eq("company_id", id);

    if (deptError) {
      console.error("Error fetching departments:", deptError);
    }

    res.json({ ...company, departments: departments || [] });
  } catch (error) {
    console.error("Get Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create a new company with departments
export const createCompany = async (req, res) => {
  try {
    const { name, departments, created_by } = req.body;

    // Create company
    const { data: newCompany, error: companyError } = await connectSqlDB
      .from("companies")
      .insert({
        name,
        created_by,
      })
      .select()
      .single();

    if (companyError) {
      throw companyError;
    }

    // Create departments if provided
    let createdDepartments = [];
    if (departments && departments.length > 0) {
      const departmentInserts = departments.map((dept) => ({
        name: dept.name,
        company_id: newCompany.id,
      }));

      const { data: newDepartments, error: deptError } = await connectSqlDB
        .from("departments")
        .insert(departmentInserts)
        .select();

      if (deptError) {
        console.error("Error creating departments:", deptError);
      } else {
        createdDepartments = newDepartments || [];
      }
    }

    res.status(201).json({
      ...newCompany,
      departments: createdDepartments,
    });
  } catch (error) {
    console.error("Create Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a company and its departments
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departments } = req.body;

    console.log(`Updating company ${id} with departments:`, departments);

    // Update company
    const { data: updatedCompany, error: companyError } = await connectSqlDB
      .from("companies")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (companyError) {
      throw companyError;
    }

    // Get existing departments to map old IDs to new ones
    const { data: existingDepartments, error: existingDeptError } =
      await connectSqlDB.from("departments").select("*").eq("company_id", id);

    if (existingDeptError) {
      throw existingDeptError;
    }

    console.log("Existing departments:", existingDepartments);

    // Create a mapping of old department IDs to new department IDs
    const departmentMapping = new Map();
    let createdDepartments = [];

    if (departments && departments.length > 0) {
      // Process each department in the request
      for (const dept of departments) {
        if (
          dept.id &&
          existingDepartments.find((existing) => existing.id === dept.id)
        ) {
          // Update existing department
          console.log(`Updating existing department ${dept.id}: ${dept.name}`);
          const { data: updatedDept, error: updateError } = await connectSqlDB
            .from("departments")
            .update({ name: dept.name })
            .eq("id", dept.id)
            .select()
            .single();

          if (updateError) {
            console.error("Error updating department:", updateError);
          } else {
            createdDepartments.push(updatedDept);
            departmentMapping.set(dept.id, dept.id); // Same ID, just updated name
          }
        } else {
          // Create new department
          console.log(`Creating new department: ${dept.name}`);
          const { data: newDept, error: createError } = await connectSqlDB
            .from("departments")
            .insert({
              name: dept.name,
              company_id: id,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating department:", createError);
          } else {
            createdDepartments.push(newDept);
            console.log(`Created new department with ID: ${newDept.id}`);
            // If this is replacing an old department (by position/name), we could map it
            // For now, new departments don't have old mappings
          }
        }
      }

      // Find departments that were deleted (exist in DB but not in request)
      const requestDeptIds = departments.filter((d) => d.id).map((d) => d.id);
      const deletedDepartments = existingDepartments.filter(
        (existing) => !requestDeptIds.includes(existing.id)
      );

      console.log("Departments to delete:", deletedDepartments);

      // Remove users from deleted departments
      if (deletedDepartments.length > 0) {
        const deletedDeptIds = deletedDepartments.map((d) => d.id);

        console.log(
          `Removing users from deleted departments: ${deletedDeptIds}`
        );

        // Remove user_departments entries for deleted departments
        const { error: removeUserDeptError } = await connectSqlDB
          .from("user_departments")
          .delete()
          .in("department_id", deletedDeptIds);

        if (removeUserDeptError) {
          console.error(
            "Error removing user departments:",
            removeUserDeptError
          );
        } else {
          console.log("Successfully removed user department assignments");
        }

        // Delete the departments
        const { error: deleteDeptError } = await connectSqlDB
          .from("departments")
          .delete()
          .in("id", deletedDeptIds);

        if (deleteDeptError) {
          console.error("Error deleting departments:", deleteDeptError);
        } else {
          console.log("Successfully deleted departments");
        }
      }
    } else {
      // If no departments provided, remove all departments and user assignments
      const existingDeptIds = existingDepartments.map((d) => d.id);

      console.log(
        "No departments provided, removing all departments and user assignments"
      );

      if (existingDeptIds.length > 0) {
        // Remove all user_departments entries for this company
        await connectSqlDB
          .from("user_departments")
          .delete()
          .in("department_id", existingDeptIds);

        // Delete all departments
        await connectSqlDB.from("departments").delete().eq("company_id", id);
      }
    }

    console.log("Final departments:", createdDepartments);

    res.json({
      ...updatedCompany,
      departments: createdDepartments,
    });
  } catch (error) {
    console.error("Update Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a company and its departments
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Deleting company ${id} and cleaning up user assignments`);

    // Get all departments for this company first
    const { data: companyDepartments, error: deptError } = await connectSqlDB
      .from("departments")
      .select("id")
      .eq("company_id", id);

    if (deptError) {
      console.error("Error fetching company departments:", deptError);
    }

    // Remove user department assignments for all departments in this company
    if (companyDepartments && companyDepartments.length > 0) {
      const departmentIds = companyDepartments.map((d) => d.id);
      console.log(
        `Removing user assignments for departments: ${departmentIds}`
      );

      const { error: userDeptError } = await connectSqlDB
        .from("user_departments")
        .delete()
        .in("department_id", departmentIds);

      if (userDeptError) {
        console.error(
          "Error removing user department assignments:",
          userDeptError
        );
      } else {
        console.log("Successfully removed user department assignments");
      }
    }

    // Delete departments
    const { error: deleteDeptError } = await connectSqlDB
      .from("departments")
      .delete()
      .eq("company_id", id);

    if (deleteDeptError) {
      console.error("Error deleting departments:", deleteDeptError);
    } else {
      console.log("Successfully deleted departments");
    }

    // Delete company
    const { error: companyError } = await connectSqlDB
      .from("companies")
      .delete()
      .eq("id", id);

    if (companyError) {
      throw companyError;
    }

    console.log("Successfully deleted company");
    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Delete Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};
