import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { FiTrash, FiUpload } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { sendEmail } from "../../api/email.api";
import { useAuth } from "../../context/AuthContext";
import { log } from "console";
interface UserOption {
  value: number;
  label: string;
}

const NewScenario = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { createScenario, generateImage } = useScenarios();
  const { users, getUsers } = useUsers();
  const { currentUser } = useUsers();
  const { loadSettings } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [aspectOptions, setAspectOptions] = useState<any>([]);
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [interactiveAvatarOptions, setInteractiveAvatarOptions] = useState<any>(
    [],
  );
  useEffect(() => {
    const loadSettingsFn = async () => {
      const settings = await loadSettings();
      setSettings(settings);
      setAspectOptions(
        settings.aspects.split(",").map((item: string) => {
          const value = item.trim();
          return {
            value: value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          };
        }),
      );
      setCategoryOptions(
        settings.scenario_categories.split(",").map((item: string) => {
          const value = item.trim();
          return {
            value: value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          };
        }),
      );
      setInteractiveAvatarOptions(
        settings.interactive_avatar.split(",").map((item: string) => {
          const [value, label] = item.trim().split(":");
          return {
            value: value?.trim() || "",
            label: label?.trim() || value?.trim() || "",
          };
        }),
      );
    };
    loadSettingsFn();
  }, []);
  // Get duplicate data from location state if it exists
  const duplicateData = location.state?.duplicateData;

  const [formData, setFormData] = useState({
    title: duplicateData?.title || "",
    context: duplicateData?.context || "",
    status: duplicateData?.status || "draft",
    user: null as number | null,
    aspects: "",
    categories: "",
    files: [] as File[],
    imagePrompt: "",
    generatedImageUrl: "",
    show_image_prompt: false,
    interactiveAvatar: "",
    avatarLanguage: "es",
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  const languageOptions = [
    { value: "es", label: t("scenarios.spanish") },
    { value: "en", label: t("scenarios.english") },
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
      aspects: newValue.map((item) => item.value).join(","),
    }));
  };

  const handleCategoriesChange = (
    newValue: readonly { value: string; label: string }[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      categories: newValue.map((item) => item.value).join(","),
    }));
  };

  const handleGenerateImage = async () => {
    if (!formData.imagePrompt) {
      toast.error("Please enter an image prompt");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateImage(formData.imagePrompt);
      setFormData((prev) => ({
        ...prev,
        generatedImageUrl: imageUrl,
      }));
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleInteractiveAvatarChange = (selectedOption: SingleValue<any>) => {
    setFormData((prev) => ({
      ...prev,
      interactiveAvatar: selectedOption ? selectedOption.value : "",
    }));
  };

  const handleAvatarLanguageChange = (selectedOption: SingleValue<any>) => {
    setFormData((prev) => ({
      ...prev,
      avatarLanguage: selectedOption ? selectedOption.value : "",
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
      formDataToSend.append("context", formData.context);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("user_id_assigned", String(formData.user));
      formDataToSend.append("created_by", String(currentUser?.id));

      // Save aspects as comma-separated string
      // const aspectsString = formData.aspects
      //   .map((aspect) => aspect.label)
      //   .join(",");
      formDataToSend.append("aspects", formData.aspects);
      formDataToSend.append("categories", formData.categories);

      formDataToSend.append("generatedImageUrl", formData.generatedImageUrl);
      formDataToSend.append(
        "show_image_prompt",
        formData.show_image_prompt.toString(),
      );
      formDataToSend.append("interactive_avatar", formData.interactiveAvatar);
      formDataToSend.append("avatar_language", formData.avatarLanguage);
      // Append each file
      formData.files.forEach((file, index) => {
        formDataToSend.append("files", file);
      });
      console.log("FormData to send:", formDataToSend);

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
              <p><strong>Context:</strong> ${formData.context || "No context provided"}</p>
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
                    {t("scenarios.context")}
                  </label>
                  <textarea
                    name="context"
                    value={formData.context}
                    onChange={handleChange}
                    placeholder="Enter scenario context"
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
                      value={
                        formData.aspects
                          ? formData.aspects.split(",").map((value) => ({
                              value: value.trim(),
                              label:
                                value.trim().charAt(0).toUpperCase() +
                                value.trim().slice(1),
                            }))
                          : []
                      }
                      onChange={handleAspectsChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder={t("scenarios.selectAspects")}
                    />
                  </div>
                </div>
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    {t("scenarios.categories")}
                  </label>
                  <Select
                    isMulti={true}
                    options={categoryOptions}
                    value={
                      formData.categories
                        ? formData.categories.split(",").map((value) => ({
                            value: value.trim(),
                            label:
                              value.trim().charAt(0).toUpperCase() +
                              value.trim().slice(1),
                          }))
                        : []
                    }
                    onChange={handleCategoriesChange}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder={t("scenarios.selectCategories")}
                  />
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
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.interactiveAvatar")}
                    </label>
                    <Select
                      options={interactiveAvatarOptions}
                      value={interactiveAvatarOptions.find(
                        (option: any) =>
                          option.value === formData.interactiveAvatar,
                      )}
                      onChange={handleInteractiveAvatarChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder={t("scenarios.selectInteractiveAvatar")}
                    />
                  </div>
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("scenarios.avatarLanguage")}
                    </label>
                    <Select
                      options={languageOptions}
                      value={languageOptions.find(
                        (option: any) =>
                          option.value === formData.avatarLanguage,
                      )}
                      onChange={handleAvatarLanguageChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder={t("scenarios.selectAvatarLanguage")}
                    />
                  </div>
                </div>
                <div className="mb-4.5">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      value=""
                      className="sr-only peer"
                      checked={formData.show_image_prompt}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          show_image_prompt: !prev.show_image_prompt,
                        }))
                      }
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {t("scenarios.showImagePrompt")}
                    </span>
                  </label>
                </div>
                {formData.show_image_prompt && (
                  <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                    <div className="w-full xl:w-1/2">
                      <div className="mb-4.5">
                        <label className="mb-2.5 block text-black dark:text-white">
                          {t("scenarios.imagePrompt")}
                        </label>
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={5}
                            name="imagePrompt"
                            value={formData.imagePrompt}
                            onChange={handleChange}
                            placeholder="Enter image prompt"
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                          >
                            {isGeneratingImage
                              ? t("scenarios.generatingImage")
                              : t("scenarios.generateImage")}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="w-full xl:w-1/2">
                      {formData.generatedImageUrl && (
                        <div className="mb-4.5">
                          <label className="mb-2.5 block text-black dark:text-white">
                            {t("scenarios.generatedImage")}
                          </label>
                          <div className="relative">
                            <img
                              src={formData.generatedImageUrl}
                              alt="Generated"
                              className="w-full rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  generatedImageUrl: "",
                                  imagePrompt: "",
                                }));
                              }}
                              className="absolute top-2 right-2 rounded-full bg-danger p-2 text-white hover:bg-opacity-90"
                            >
                              <FiTrash />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
