import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { FiUpload } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { sendEmail } from "../../api/email.api";

interface UserOption {
  value: number;
  label: string;
}

const NewScenario = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { createScenario } = useScenarios();
  const { users, getUsers } = useUsers();
  const { currentUser } = useUsers();

  // Get duplicate data from location state if it exists
  const duplicateData = location.state?.duplicateData;

  const [formData, setFormData] = useState({
    title: duplicateData?.title || "",
    description: duplicateData?.description || "",
    status: duplicateData?.status || "draft",
    user: null as number | null,
    aspects: [] as { value: string; label: string }[],
    files: [] as File[],
  });
  // Transform users data for react-select
  const userOptions: UserOption[] = users
    .filter((user) =>
      currentUser?.role === "admin"
        ? true
        : user.created_by === currentUser?.id,
    )
    .map((user) => ({
      value: user.id!,
      label: `${user.name} (${user.email})`,
    }));

  const aspectOptions = [
    { value: "aspect1", label: "Aspect 1" },
    { value: "aspect2", label: "Aspect 2" },
    { value: "aspect3", label: "Aspect 3" },
  ];

  useEffect(() => {
    getUsers();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserSelect = (selectedOption: SingleValue<UserOption>) => {
    setFormData((prev) => ({
      ...prev,
      user: selectedOption ? selectedOption.value : null,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleAspectsChange = (
    newValue: readonly { value: string; label: string }[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      aspects: [...newValue],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.user) {
      toast.error("Please select a user");
      return;
    }

    try {
      // Create FormData object to send files
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("user_id_assigned", String(formData.user));
      formDataToSend.append("created_by", String(currentUser?.id));
      formDataToSend.append("aspects", JSON.stringify(formData.aspects));

      // Append each file
      formData.files.forEach((file) => {
        formDataToSend.append("files", file);
      });

      // Get the selected user's details
      const selectedUser = users.find((user) => user.id === formData.user);
      if (!selectedUser) {
        throw new Error("Selected user not found");
      }

      await createScenario(formDataToSend);

      // Send email notification
      await sendEmail({
        email: selectedUser.email,
        subject: `New Scenario Assignment: ${formData.title}`,
        message: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Hello ${selectedUser.name},</h2>
            <p>You have been assigned to a new scenario in SimulAI.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Scenario:</strong> ${formData.title}</p>
              <p><strong>Description:</strong> ${formData.description || "No description provided"}</p>
              ${
                formData.aspects.length > 0
                  ? `
                <p><strong>Aspects to evaluate:</strong></p>
                <ul>
                  ${formData.aspects.map((aspect) => `<li>${aspect.label}</li>`).join("")}
                </ul>
              `
                  : ""
              }
              ${
                formData.files.length > 0
                  ? `
                <p><strong>Attached files:</strong> ${formData.files.length} file(s)</p>
              `
                  : ""
              }
            </div>
            
            <p>You can access this scenario from your dashboard.</p>
            <p>Best regards,<br>SimulAI Team</p>
          </div>
        `,
      });

      toast.success("Scenario created successfully");
      navigate("/scenarios");
    } catch (error) {
      console.error("Error creating scenario:", error);
      toast.error("Error creating scenario");
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("scenarios.newScenario")} />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {t("scenarios.newScenario")}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.name")}{" "}
                      <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter scenario title"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>

                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.status")}
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    >
                      <option value="draft">{t("scenarios.draft")}</option>
                      <option value="published">
                        {t("scenarios.published")}
                      </option>
                      <option value="archived">
                        {t("scenarios.archived")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    {t("scenarios.description")}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter scenario description"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    rows={4}
                  />
                </div>
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.assignUser")}{" "}
                      <span className="text-meta-1">*</span>
                    </label>
                    <Select
                      options={userOptions}
                      onChange={handleUserSelect}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder={t("scenarios.selectUser")}
                    />
                  </div>

                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.aspects")}{" "}
                      <span className="text-meta-1">*</span>
                    </label>
                    <CreatableSelect
                      isMulti={true}
                      options={aspectOptions}
                      value={formData.aspects}
                      onChange={handleAspectsChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder={t("scenarios.selectAspects")}
                    />
                  </div>
                </div>
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    {t("scenarios.attachFiles")}
                  </label>
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="fileInput"
                      />
                      <label
                        htmlFor="fileInput"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-primary bg-gray py-4 hover:bg-opacity-90"
                      >
                        <FiUpload className="text-primary" />
                        <span className="text-primary">
                          {t("scenarios.clickToUploadFiles")}
                        </span>
                      </label>
                    </div>
                    {formData.files.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <label className="text-sm text-black dark:text-white">
                          {t("scenarios.attachedFiles")}
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {formData.files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded-md bg-gray-2 px-3 py-1 dark:bg-meta-4"
                            >
                              <span className="text-sm text-black dark:text-white">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="text-danger hover:text-meta-1"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  {t("scenarios.createScenario")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewScenario;
