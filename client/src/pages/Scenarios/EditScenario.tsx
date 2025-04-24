import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { FiUpload, FiTrash } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface UserOption {
  value: number;
  label: string;
}

interface ExistingFile {
  path: string;
  name: string;
}

interface Scenario {
  id: number;
  title: string;
  context: string;
  status: string;
  user_id_assigned: number | null;
  aspects: { value: string; label: string }[];
  files: string[];
  assignedIA: string;
  assignedIAModel?: string;
  generated_image_url?: string;
}

interface FormData {
  title: string;
  context: string;
  status: string;
  user: UserOption | null;
  aspects: { value: string; label: string }[];
  files: File[];
  existingFiles: string[];
  assignedIA: string;
  assignedIAModel?: string;
  imagePrompt: string;
  generatedImageUrl: string;
}

const EditScenario = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getScenario, updateScenario, generateImage } = useScenarios();
  const { users, getUsers } = useUsers();
  const { currentUser } = useUsers();
  const { id } = useParams();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    context: "",
    status: "draft",
    user: null,
    aspects: [],
    files: [],
    existingFiles: [],
    assignedIA: "openai",
    assignedIAModel: "gpt-4o",
    imagePrompt: "",
    generatedImageUrl: "",
  });

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const aspectOptions = [
    { value: "aspect1", label: "Aspect 1" },
    { value: "aspect2", label: "Aspect 2" },
    { value: "aspect3", label: "Aspect 3" },
  ];

  useEffect(() => {
    getUsers();
  }, []);

  useEffect(() => {
    const loadScenario = async () => {
      const scenario = await getScenario(Number(id));
      setFormData({
        title: scenario.title,
        context: scenario.context,
        status: scenario.status,
        user: scenario.user_id_assigned
          ? {
              value: scenario.user_id_assigned,
              label: scenario.user_id_assigned.toString(),
            }
          : null,
        aspects: scenario.aspects || [],
        files: scenario.files || [],
        existingFiles: scenario.files || [],
        assignedIA: scenario.assignedIA || "openai",
        assignedIAModel: scenario.assignedIAModel,
        imagePrompt: "",
        generatedImageUrl: scenario.generated_image_url || "",
      });
    };
    loadScenario();
  }, [id]);

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
      user: selectedOption,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...newFiles],
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveExistingFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((_, i) => i !== index),
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

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      generatedImageUrl: "",
      imagePrompt: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.user) {
      toast.error("Please select a user");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("context", formData.context);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("user_id_assigned", String(formData.user.value));
      formDataToSend.append("created_by", String(currentUser?.id));
      formDataToSend.append("aspects", JSON.stringify(formData.aspects));
      formDataToSend.append("assigned_ia", formData.assignedIA);
      formDataToSend.append("generatedImageUrl", formData.generatedImageUrl);

      // Append files
      formData.files.forEach((file) => {
        formDataToSend.append("files", file);
      });

      // Append existing files
      formData.existingFiles.forEach((file) => {
        formDataToSend.append("existing_files", file);
      });

      await updateScenario(Number(id), formDataToSend);
      toast.success("Scenario updated successfully");
      navigate("/scenarios");
    } catch (error) {
      console.error("Error updating scenario:", error);
      toast.error("Error updating scenario");
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("scenarios.editScenario")} />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {t("scenarios.editScenario")}
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
                      placeholder={t("scenarios.enterScenarioTitle")}
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
                {currentUser?.role === "admin" && (
                  <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        {t("scenarios.assignedIA")}
                        <span className="text-meta-1">*</span>
                      </label>
                      <select
                        name="assignedIA"
                        value={formData.assignedIA}
                        onChange={handleChange}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="mistral">Mistral</option>
                        <option value="llama">Llama</option>
                      </select>
                    </div>

                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        {t("scenarios.assignedIAModel")}
                      </label>
                      <select
                        name="assignedIAModel"
                        value={formData.assignedIAModel}
                        onChange={handleChange}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      >
                        {formData.assignedIA === "openai" && (
                          <>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o-mini</option>
                            <option value="gpt-3.5-turbo">GPT-3.5-turbo</option>
                            <option value="gpt-3.5-turbo-mini">
                              GPT-3.5-turbo-mini
                            </option>
                          </>
                        )}
                        {formData.assignedIA === "mistral" && (
                          <>
                            <option value="mistral-large-latest">
                              Mistral-large-latest
                            </option>
                            <option value="pixtral-large-latest">
                              Pixtral-large-latest
                            </option>
                            <option value="mistral-moderation-latest">
                              Mistral-moderation-latest
                            </option>
                            <option value="ministral-3b-latest">
                              Ministral-3b-latest
                            </option>
                            <option value="ministral-8b-latest">
                              Ministral-8b-latest
                            </option>
                            <option value="open-mistral-nemo">
                              Open-mistral-nemo
                            </option>
                            <option value="mistral-small-latest">
                              Mistral-small-latest
                            </option>
                            <option value="mistral-saba-latest">
                              Mistral-saba-latest
                            </option>
                            <option value="codestral-latest">
                              Codestral-latest
                            </option>
                          </>
                        )}
                        {formData.assignedIA === "llama" && (
                          <>
                            <option value="llama3.3-70b">Llama 3.3 70B</option>
                            <option value="llama3.1-405b">
                              Llama 3.1 405B
                            </option>
                            <option value="llama3.1-8b">Llama 3.1 8B</option>
                            <option value="llama3.1-8b-instruct">
                              Llama 3.1 8B Instruct
                            </option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    {t("scenarios.context")}
                  </label>
                  <textarea
                    name="context"
                    value={formData.context}
                    onChange={handleChange}
                    placeholder={t("scenarios.enterScenarioContext")}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    rows={4}
                  />
                </div>
                <div className="mb-4.5">
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
                                <a
                                  href={
                                    typeof file === "string"
                                      ? file
                                      : URL.createObjectURL(file)
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  File {index + 1} {file.name}
                                </a>
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
                        <div className="relative w-full">
                          <img
                            src={formData.generatedImageUrl}
                            alt="Generated"
                            className="w-full rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 rounded-full bg-danger p-2 text-white hover:bg-opacity-90"
                          >
                            <FiTrash />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="flex w-1/3 justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                  >
                    {t("scenarios.updateScenario")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditScenario;
