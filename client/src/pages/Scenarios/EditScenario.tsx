import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { FiUpload } from "react-icons/fi";

interface ExistingFile {
  path: string;
  name: string;
}

const EditScenario = () => {
  const navigate = useNavigate();
  const { getScenario, updateScenario } = useScenarios();
  const { users, getUsers } = useUsers();
  const { currentUser } = useUsers();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    user: null as number | null,
    aspects: [] as { value: string; label: string }[],
    files: [] as File[],
    existingFiles: [] as string[],
  });
  console.log(formData);

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
        description: scenario.description,
        status: scenario.status,
        user: scenario.user_id_assigned,
        aspects: scenario.aspects || [],
        files: [],
        existingFiles: scenario.files || [],
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

  const handleRemoveExistingFile = (fileToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((file) => file !== fileToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("aspects", JSON.stringify(formData.aspects));
      formDataToSend.append(
        "existingFiles",
        JSON.stringify(formData.existingFiles),
      );

      // Append each new file
      formData.files.forEach((file) => {
        formDataToSend.append("files", file);
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
      <Breadcrumb pageName="Edit Scenario" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Edit Scenario
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Title <span className="text-meta-1">*</span>
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
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Description
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

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Aspects to evaluate <span className="text-meta-1">*</span>
                  </label>
                  <CreatableSelect
                    isMulti={true}
                    options={aspectOptions}
                    value={formData.aspects}
                    onChange={handleAspectsChange}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Select aspects to evaluate..."
                  />
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Attach Files
                  </label>
                  <div className="flex flex-col gap-4">
                    {formData.existingFiles.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <label className="text-sm text-black dark:text-white">
                          Existing Files:
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {formData.existingFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 rounded-md bg-gray-2 px-3 py-1 dark:bg-meta-4"
                            >
                              <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:text-opacity-90"
                              >
                                File {index + 1}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingFile(file)}
                                className="text-danger hover:text-meta-1"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                          Click to upload files
                        </span>
                      </label>
                    </div>
                    {formData.files.length > 0 && (
                      <div className="flex flex-col gap-2.5">
                        <label className="text-sm text-black dark:text-white">
                          New Files to Upload:
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

                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="flex w-1/3 justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                  >
                    Update Scenario
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
