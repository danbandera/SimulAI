import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies } from "../../context/CompanyContext";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTrash } from "react-icons/fi";

interface Department {
  name: string;
}

const NewCompany: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createCompany } = useCompanies();
  const { currentUser } = useUsers();

  const [formData, setFormData] = useState({
    name: "",
    departments: [{ name: "" }] as Department[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

    // Validate that company name is provided
    if (!formData.name.trim()) {
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
      await createCompany({
        name: formData.name,
        departments: validDepartments,
        created_by: Number(currentUser?.id),
      });

      toast.success("Company created successfully!");
      navigate("/companies");
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast.error(error.message || "Error creating company");
    }
  };

  return (
    <>
      <Breadcrumb pageName="New Company" />

      <div className="grid grid-cols-1 gap-12">
        <div className="flex flex-col gap-12">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Create New Company
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Company Name <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    required
                  />
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
                          value={department.name}
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

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewCompany;
