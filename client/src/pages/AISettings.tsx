import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FiPlus, FiTrash, FiEye, FiEyeOff } from "react-icons/fi";
import Swal from "sweetalert2";

interface AspectItem {
  value: string;
}

interface ScenarioCategoryItem {
  value: string;
}

interface InteractiveAvatarItem {
  id: string;
  name: string;
}

const AISettings = () => {
  const { t } = useTranslation();
  const { loadSettings, updateSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showHeyGenKey, setShowHeyGenKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [settings, setSettings] = useState({
    heygen_key: "",
    openai_key: "",
    mistral_key: "",
    llama_key: "",
    promt_for_virtual_avatar: "",
    promt_for_analyse_conversation: "",
    aspects: [] as AspectItem[],
    scenario_categories: [] as ScenarioCategoryItem[],
    interactive_avatar: [] as InteractiveAvatarItem[],
  });

  useEffect(() => {
    loadSettingsFn();
  }, []);

  const loadSettingsFn = async () => {
    try {
      const data = await loadSettings();
      if (data) {
        // Parse the string data into arrays for dynamic lists
        const parsedAspects = data.aspects
          ? data.aspects
              .split(",")
              .map((item: string) => ({ value: item.trim() }))
              .filter((item: AspectItem) => item.value)
          : [{ value: "" }];

        const parsedScenarioCategories = data.scenario_categories
          ? data.scenario_categories
              .split(",")
              .map((item: string) => ({ value: item.trim() }))
              .filter((item: ScenarioCategoryItem) => item.value)
          : [{ value: "" }];

        let parsedInteractiveAvatars = [{ id: "", name: "" }];
        if (data.interactive_avatar) {
          try {
            parsedInteractiveAvatars = JSON.parse(data.interactive_avatar);
          } catch (error) {
            // If JSON parsing fails, treat as comma-separated string (backward compatibility)
            console.warn(
              "Failed to parse interactive_avatar as JSON, treating as string",
            );
            parsedInteractiveAvatars = [
              { id: "", name: data.interactive_avatar },
            ];
          }
        }

        setSettings({
          heygen_key: data.heygen_key || "",
          openai_key: data.openai_key || "",
          mistral_key: data.mistral_key || "",
          llama_key: data.llama_key || "",
          promt_for_virtual_avatar: data.promt_for_virtual_avatar || "",
          promt_for_analyse_conversation:
            data.promt_for_analyse_conversation || "",
          aspects: parsedAspects.length > 0 ? parsedAspects : [{ value: "" }],
          scenario_categories:
            parsedScenarioCategories.length > 0
              ? parsedScenarioCategories
              : [{ value: "" }],
          interactive_avatar:
            parsedInteractiveAvatars.length > 0
              ? parsedInteractiveAvatars
              : [{ id: "", name: "" }],
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error(t("common.errorOccurred"));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Aspect handlers
  const handleAspectChange = (index: number, value: string) => {
    const updatedAspects = [...settings.aspects];
    updatedAspects[index].value = value;
    setSettings({
      ...settings,
      aspects: updatedAspects,
    });
  };

  const addAspect = () => {
    setSettings({
      ...settings,
      aspects: [...settings.aspects, { value: "" }],
    });
  };

  const removeAspect = (index: number) => {
    if (settings.aspects.length > 1) {
      const updatedAspects = settings.aspects.filter((_, i) => i !== index);
      setSettings({
        ...settings,
        aspects: updatedAspects,
      });
    }
  };

  // Scenario Category handlers
  const handleScenarioCategoryChange = (index: number, value: string) => {
    const updatedCategories = [...settings.scenario_categories];
    updatedCategories[index].value = value;
    setSettings({
      ...settings,
      scenario_categories: updatedCategories,
    });
  };

  const addScenarioCategory = () => {
    setSettings({
      ...settings,
      scenario_categories: [...settings.scenario_categories, { value: "" }],
    });
  };

  const removeScenarioCategory = (index: number) => {
    if (settings.scenario_categories.length > 1) {
      const updatedCategories = settings.scenario_categories.filter(
        (_, i) => i !== index,
      );
      setSettings({
        ...settings,
        scenario_categories: updatedCategories,
      });
    }
  };

  // Interactive Avatar handlers
  const handleInteractiveAvatarChange = (
    index: number,
    field: "id" | "name",
    value: string,
  ) => {
    const updatedAvatars = [...settings.interactive_avatar];
    updatedAvatars[index][field] = value;
    setSettings({
      ...settings,
      interactive_avatar: updatedAvatars,
    });
  };

  const addInteractiveAvatar = () => {
    setSettings({
      ...settings,
      interactive_avatar: [
        ...settings.interactive_avatar,
        { id: "", name: "" },
      ],
    });
  };

  const removeInteractiveAvatar = (index: number) => {
    if (settings.interactive_avatar.length > 1) {
      const updatedAvatars = settings.interactive_avatar.filter(
        (_, i) => i !== index,
      );
      setSettings({
        ...settings,
        interactive_avatar: updatedAvatars,
      });
    }
  };

  const handleSubmit = async (section: string) => {
    setLoading(true);
    try {
      let dataToUpdate = {};

      switch (section) {
        case "virtual_avatar":
          dataToUpdate = {
            promt_for_virtual_avatar: settings.promt_for_virtual_avatar,
          };
          break;
        case "analyse_conversation":
          dataToUpdate = {
            promt_for_analyse_conversation:
              settings.promt_for_analyse_conversation,
          };
          break;
        case "aspects":
          const validAspects = settings.aspects.filter(
            (item) => item.value.trim() !== "",
          );
          dataToUpdate = {
            aspects: validAspects.map((item) => item.value).join(","),
          };
          break;
        case "scenario_categories":
          const validCategories = settings.scenario_categories.filter(
            (item) => item.value.trim() !== "",
          );
          dataToUpdate = {
            scenario_categories: validCategories
              .map((item) => item.value)
              .join(","),
          };
          break;
        case "interactive_avatar":
          const validAvatars = settings.interactive_avatar.filter(
            (item) => item.id.trim() !== "" && item.name.trim() !== "",
          );
          dataToUpdate = {
            interactive_avatar: JSON.stringify(validAvatars),
          };
          break;
        case "ai":
          dataToUpdate = {
            heygen_key: settings.heygen_key,
            openai_key: settings.openai_key,
            mistral_key: settings.mistral_key,
            llama_key: settings.llama_key,
          };
          break;
      }

      await updateSettings(dataToUpdate);
      toast.success(t("common.savedSuccessfully"));
      Swal.fire({
        title: t("alerts.settingsSaved"),
        text: t("alerts.settingsSavedMessage"),
        icon: "success",
        confirmButtonText: t("alerts.ok"),
        confirmButtonColor: "#3C50E0",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(t("common.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName={t("settingsAdmin.aiSettings")} />

        {/* Prompt for Virtual Avatar */}
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.PromtForVirtualAvatar")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("virtual_avatar");
                  }}
                >
                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="promt_for_virtual_avatar"
                    >
                      {t("settingsAdmin.PromtForVirtualAvatarDescription")}
                    </label>
                    <textarea
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      name="promt_for_virtual_avatar"
                      id="promt_for_virtual_avatar"
                      value={settings.promt_for_virtual_avatar || ""}
                      onChange={handleChange}
                      rows={5}
                    />
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt for Analyse Conversation */}
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.PromtForAnalyseConversation")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("analyse_conversation");
                  }}
                >
                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="promt_for_analyse_conversation"
                    >
                      {t(
                        "settingsAdmin.PromtForAnalyseConversationDescription",
                      )}
                    </label>
                    <textarea
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      name="promt_for_analyse_conversation"
                      id="promt_for_analyse_conversation"
                      value={settings.promt_for_analyse_conversation || ""}
                      onChange={handleChange}
                      rows={5}
                    />
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Aspects */}
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.Aspects")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("aspects");
                  }}
                >
                  <div className="mb-4.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="block text-black dark:text-white">
                        {t("settingsAdmin.AspectsDescription")}
                      </label>
                      <button
                        type="button"
                        onClick={addAspect}
                        className="inline-flex items-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        <FiPlus size={16} />
                        Add Aspect
                      </button>
                    </div>

                    <div className="space-y-3">
                      {settings.aspects.map((aspect, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={aspect.value}
                            onChange={(e) =>
                              handleAspectChange(index, e.target.value)
                            }
                            placeholder={`Aspect ${index + 1}`}
                            className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          {settings.aspects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAspect(index)}
                              className="inline-flex items-center justify-center rounded bg-danger py-3 px-3 text-white hover:bg-opacity-90"
                            >
                              <FiTrash size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Categories */}
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.scenarioCategories")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("scenario_categories");
                  }}
                >
                  <div className="mb-4.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="block text-black dark:text-white">
                        {t("settingsAdmin.scenarioCategoriesDescription")}
                      </label>
                      <button
                        type="button"
                        onClick={addScenarioCategory}
                        className="inline-flex items-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        <FiPlus size={16} />
                        Add Category
                      </button>
                    </div>

                    <div className="space-y-3">
                      {settings.scenario_categories.map((category, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={category.value}
                            onChange={(e) =>
                              handleScenarioCategoryChange(
                                index,
                                e.target.value,
                              )
                            }
                            placeholder={`Category ${index + 1}`}
                            className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          {settings.scenario_categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeScenarioCategory(index)}
                              className="inline-flex items-center justify-center rounded bg-danger py-3 px-3 text-white hover:bg-opacity-90"
                            >
                              <FiTrash size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Avatar */}
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.interactiveAvatar")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("interactive_avatar");
                  }}
                >
                  <div className="mb-4.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <label
                        className="block text-black dark:text-white"
                        dangerouslySetInnerHTML={{
                          __html: t(
                            "settingsAdmin.interactiveAvatarDescription",
                          ),
                        }}
                      />
                      <button
                        type="button"
                        onClick={addInteractiveAvatar}
                        className="inline-flex items-center gap-2 rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        <FiPlus size={16} />
                        Add Avatar
                      </button>
                    </div>

                    <div className="space-y-3">
                      {settings.interactive_avatar.map((avatar, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={avatar.id}
                            onChange={(e) =>
                              handleInteractiveAvatarChange(
                                index,
                                "id",
                                e.target.value,
                              )
                            }
                            placeholder={`Avatar ${index + 1} ID`}
                            className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          <input
                            type="text"
                            value={avatar.name}
                            onChange={(e) =>
                              handleInteractiveAvatarChange(
                                index,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder={`Avatar ${index + 1} Name`}
                            className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                          />
                          {settings.interactive_avatar.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInteractiveAvatar(index)}
                              className="inline-flex items-center justify-center rounded bg-danger py-3 px-3 text-white hover:bg-opacity-90"
                            >
                              <FiTrash size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* AI Keys */}
        <div className="grid grid-cols-5 gap-8 mt-8">
          <div className="col-span-5">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  {t("settingsAdmin.AIKeys")}
                </h3>
              </div>
              <div className="p-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit("ai");
                  }}
                >
                  <div className="mb-5.5">
                    <div className="w-full">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="heygen_key"
                      >
                        {t("settingsAdmin.heyGenKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 pr-12 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type={showHeyGenKey ? "text" : "password"}
                          name="heygen_key"
                          id="heygen_key"
                          placeholder="NjE4ZjQ..."
                          value={settings.heygen_key || ""}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          onClick={() => setShowHeyGenKey(!showHeyGenKey)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showHeyGenKey ? (
                            <FiEyeOff size={20} />
                          ) : (
                            <FiEye size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5">
                    <div className="w-full">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="openai_key"
                      >
                        {t("settingsAdmin.openAIKey")}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 pr-12 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type={showOpenAIKey ? "text" : "password"}
                          name="openai_key"
                          id="openai_key"
                          placeholder="sk-proj-..."
                          value={settings.openai_key || ""}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showOpenAIKey ? (
                            <FiEyeOff size={20} />
                          ) : (
                            <FiEye size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={loadSettingsFn}
                    >
                      {t("settingsAdmin.cancelKeys")}
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                      disabled={loading}
                    >
                      {t("settingsAdmin.saveKeys")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AISettings;
