import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies } from "../../context/CompanyContext";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTrash, FiUpload, FiX } from "react-icons/fi";

interface Department {
  id?: number;
  name: string;
  company_id?: number;
}

const EditCompany: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateCompany, getCompany } = useCompanies();
  const { currentUser } = useUsers();

  const [formData, setFormData] = useState({
    name: "",
    departments: [{ name: "" }] as Department[],
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        if (id) {
          const company = await getCompany(Number(id));

          // Check if company user is trying to edit their own company
          if (
            currentUser?.role === "company" &&
            currentUser?.company_id !== Number(id)
          ) {
            toast.error("You can only edit your own company");
            navigate("/");
            return;
          }

          setFormData({
            name: company.name,
            departments:
              company.departments.length > 0
                ? company.departments
                : [{ name: "" }],
          });

          // Set existing logo
          if (company.logo) {
            setExistingLogo(company.logo);
            setLogoPreview(company.logo);
          }
        }
      } catch (error) {
        console.error("Error loading company:", error);
        toast.error("Error loading company");
        navigate("/companies");
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [id, getCompany, navigate, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(existingLogo); // Reset to existing logo if any
    // Reset file input
    const fileInput = document.getElementById(
      "logo-upload",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const removeExistingLogo = () => {
    setExistingLogo(null);
    setLogoPreview(null);
    setLogoFile(null);
    // Reset file input
    const fileInput = document.getElementById(
      "logo-upload",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleDepartmentChange = (index: number, value: string) => {
    const updatedDepartments = [...formData.departments];
    updatedDepartments[index].name = value;
    setFormData({
      ...formData,
      departments: updatedDepartments,
    });
  };

  const addDepartment = () => {
    setFormData({
      ...formData,
      departments: [...formData.departments, { name: "" }],
    });
  };

  const removeDepartment = (index: number) => {
    if (formData.departments.length > 1) {
      const updatedDepartments = formData.departments.filter(
        (_, i) => i !== index,
      );
      setFormData({
        ...formData,
        departments: updatedDepartments,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // For company users, don't validate or update company name
    const isCompanyUser = currentUser?.role === "company";

    // Validate that company name is provided (only for admin users)
    if (!isCompanyUser && !formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    // Filter out empty department names
    const validDepartments = formData.departments.filter(
      (dept) => dept.name.trim() !== "",
    );

    if (validDepartments.length === 0) {
      toast.error("At least one department is required");
      return;
    }

    try {
      // If there's a new logo file, use FormData, otherwise use regular object
      if (logoFile) {
        const submitData = new FormData();
        // Only include name for admin users
        if (!isCompanyUser) {
          submitData.append("name", formData.name);
        }
        submitData.append("departments", JSON.stringify(validDepartments));
        submitData.append("logo", logoFile);

        await updateCompany(Number(id), submitData);
      } else {
        const updateData: any = {
          departments: validDepartments,
          created_by: Number(currentUser?.id),
        };

        // Only include name for admin users
        if (!isCompanyUser) {
          updateData.name = formData.name;
        }

        await updateCompany(Number(id), updateData);
      }

      toast.success(
        isCompanyUser
          ? "Departments and logo updated successfully!"
          : "Company updated successfully!",
      );
      navigate(isCompanyUser ? "/" : "/companies");
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast.error(error.message || "Error updating company");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        pageName={
          currentUser?.role === "company" ? "Edit Departments" : "Edit Company"
        }
      />

      <div className="grid grid-cols-1 gap-12">
        <div className="flex flex-col gap-12">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {currentUser?.role === "company"
                  ? "Edit Departments & Logo"
                  : "Edit Company"}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Company Name{" "}
                    {currentUser?.role !== "company" && (
                      <span className="text-meta-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    required={currentUser?.role !== "company"}
                    disabled={currentUser?.role === "company"}
                  />
                  {currentUser?.role === "company" && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Company name cannot be changed by company users
                    </p>
                  )}
                </div>

                <div className="mb-4.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="block text-black dark:text-white">
                      Departments <span className="text-meta-1">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addDepartment}
                      className="inline-flex items-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
                    >
                      <FiPlus size={16} />
                      Add Department
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.departments.map((department, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={department.id + " - " + department.name}
                          onChange={(e) =>
                            handleDepartmentChange(index, e.target.value)
                          }
                          placeholder={`Department ${index + 1} name`}
                          className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                        />
                        {formData.departments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDepartment(index)}
                            className="inline-flex items-center justify-center rounded bg-danger py-3 px-3 text-white hover:bg-opacity-90"
                          >
                            <FiTrash size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Company Logo
                  </label>

                  {logoPreview ? (
                    <div className="mb-3">
                      <div className="relative inline-block">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-20 w-20 object-contain rounded border border-stroke dark:border-strokedark"
                        />
                        <button
                          type="button"
                          onClick={logoFile ? removeLogo : removeExistingLogo}
                          className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-danger p-1 text-white hover:bg-opacity-90"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label
                        htmlFor="logo-upload"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-stroke bg-gray py-6 px-4 text-center dark:border-strokedark dark:bg-meta-4"
                      >
                        <FiUpload size={20} />
                        <span>Click to upload logo</span>
                      </label>
                    </div>
                  )}

                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supported formats: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  {currentUser?.role === "company"
                    ? "Update Departments & Logo"
                    : "Update Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCompany;
