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

    // Delete existing departments
    await connectSqlDB.from("departments").delete().eq("company_id", id);

    // Create new departments if provided
    let createdDepartments = [];
    if (departments && departments.length > 0) {
      const departmentInserts = departments.map((dept) => ({
        name: dept.name,
        company_id: id,
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

    // Delete departments first (cascade should handle this, but being explicit)
    await connectSqlDB.from("departments").delete().eq("company_id", id);

    // Delete company
    const { error: companyError } = await connectSqlDB
      .from("companies")
      .delete()
      .eq("id", id);

    if (companyError) {
      throw companyError;
    }

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Delete Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};
