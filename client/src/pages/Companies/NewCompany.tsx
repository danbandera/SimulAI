import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies } from "../../context/CompanyContext";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTrash, FiUpload, FiX } from "react-icons/fi";

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

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
        toast.error(t("companies.pleaseSelectImageFile"));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("companies.logoFileSizeLimit"));
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
    setLogoPreview(null);
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

    // Validate that company name is provided
    if (!formData.name.trim()) {
      toast.error(t("companies.companyNameRequired"));
      return;
    }

    // Filter out empty department names
    const validDepartments = formData.departments.filter(
      (dept) => dept.name.trim() !== "",
    );

    if (validDepartments.length === 0) {
      toast.error(t("companies.atLeastOneDepartmentRequired"));
      return;
    }

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("departments", JSON.stringify(validDepartments));
      submitData.append("created_by", String(currentUser?.id));

      if (logoFile) {
        submitData.append("logo", logoFile);
      }

      await createCompany(submitData);

      toast.success(t("companies.companyCreatedSuccessfully"));
      navigate("/companies");
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast.error(error.message || t("companies.errorCreatingCompany"));
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("companies.newCompany")} />

      <div className="grid grid-cols-1 gap-12">
        <div className="flex flex-col gap-12">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {t("companies.createNewCompany")}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    {t("companies.companyName")}{" "}
                    <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("companies.enterCompanyName")}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    required
                  />
                </div>

                <div className="mb-4.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="block text-black dark:text-white">
                      {t("companies.departments")}{" "}
                      <span className="text-meta-1">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addDepartment}
                      className="inline-flex items-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
                    >
                      <FiPlus size={16} />
                      {t("companies.addDepartment")}
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
                          placeholder={t("companies.departmentName", {
                            number: index + 1,
                          })}
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
                    {t("companies.companyLogo")}
                  </label>

                  {logoPreview ? (
                    <div className="mb-3">
                      <div className="relative inline-block">
                        <img
                          src={logoPreview}
                          alt={t("companies.logoPreview")}
                          className="h-20 w-20 object-contain rounded border border-stroke dark:border-strokedark"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
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
                        <span>{t("companies.clickToUploadLogo")}</span>
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
                    {t("companies.supportedFormats")}
                  </p>
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  {t("companies.createCompany")}
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
