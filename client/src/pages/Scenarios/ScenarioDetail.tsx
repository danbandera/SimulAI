import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
// import { ConsolePage } from "./ConsolePage";
import InteractiveAvatar from "../../components/InteractiveAvatar/InteractiveAvatar";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
// import { User } from "../../api/users.api";

// Define a local interface that matches what we get from the API
interface ScenarioDetail {
  id: number;
  title: string;
  context: string;
  status: string;
  created_by?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at?: string;
  aspects?: string;
  categories?: string;
  files?: string[];
  generated_image_url?: string;
  show_image_prompt?: boolean;
  interactive_avatar?: string;
  avatar_language?: string;
  timeLimit?: number;
  users?: number[];
  pdf_contents?: string;
}

interface TimeInfo {
  time_limit: number;
  total_elapsed_time: number;
  remaining_time: number;
  conversations_count: number;
}

const ScenarioDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getScenario, deleteScenario, getScenarioElapsedTime } =
    useScenarios();
  const { currentUser, users, getUsers } = useUsers();
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [timeInfo, setTimeInfo] = useState<TimeInfo | null>(null);
  // get the aspects from the scenario as string
  // const aspects = scenario?.aspects || "";
  // const context = scenario?.context || "";

  // Format time helper function
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  // Function to refresh time information
  const refreshTimeInfo = async () => {
    if (id) {
      try {
        const timeData = await getScenarioElapsedTime(parseInt(id));
        setTimeInfo(timeData);
      } catch (timeError) {
        console.error("Error loading time information:", timeError);
      }
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  useEffect(() => {
    const loadScenario = async () => {
      if (id) {
        try {
          const data = await getScenario(parseInt(id));
          if (data) {
            // Cast the data to our local interface
            setScenario(data as unknown as ScenarioDetail);

            // Load elapsed time information
            await refreshTimeInfo();
          }
        } catch (error) {
          console.error("Error loading scenario:", error);
        }
      }
    };
    loadScenario();
  }, [id, getScenario]);

  // Set up periodic refresh of time information
  useEffect(() => {
    if (!id) return;

    // Refresh time info every 5 seconds to stay in sync with timer
    const interval = setInterval(() => {
      refreshTimeInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const handleEdit = () => {
    navigate(`/scenarios/edit/${id}`);
  };

  const handleDuplicate = () => {
    navigate("/scenarios/new", {
      state: {
        duplicateData: {
          title: scenario?.title,
          context: scenario?.context,
          status: scenario?.status,
        },
      },
    });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t("alerts.deleteConfirmTitle"),
      text: t("alerts.deleteConfirmMessage"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3C50E0",
      cancelButtonColor: "#D34053",
      confirmButtonText: t("alerts.yes"),
      cancelButtonText: t("alerts.cancel"),
    });

    if (result.isConfirmed && id) {
      try {
        await deleteScenario(parseInt(id));
        Swal.fire({
          title: t("alerts.deleteSuccessTitle"),
          text: t("alerts.scenarioDeletedMessage"),
          icon: "success",
          confirmButtonColor: "#3C50E0",
        });
        navigate("/scenarios");
      } catch (error) {
        Swal.fire({
          title: t("alerts.deleteErrorTitle"),
          text: t("alerts.scenarioDeleteErrorMessage"),
          icon: "error",
          confirmButtonColor: "#D34053",
        });
      }
    }
  };

  return (
    <>
      <Breadcrumb pageName={scenario?.title || ""} />

      <div className="grid grid-cols-1 gap-9">
        {/* Scenario Details Card */}
        {!(currentUser?.role === "user") && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-black dark:text-white">
                  {t("scenarios.scenarioDetails")}
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/scenarios/${id}/report`)}
                    className="inline-flex items-center justify-center rounded-md bg-purple-700 py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    {t("scenarios.generateReport")}
                  </button>
                  <button
                    onClick={() => navigate(`/scenarios/${id}/conversations`)}
                    className="inline-flex items-center justify-center rounded-md bg-green-700 py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    {t("scenarios.viewConversationsDetails")}
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="inline-flex items-center justify-center rounded-md bg-meta-3 py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    {t("scenarios.duplicateDetails")}
                  </button>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    {t("scenarios.editDetails")}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    {t("scenarios.deleteDetails")}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6.5">
              <div className="mb-4.5">
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="font-medium text-black dark:text-white mb-2">
                      {t("scenarios.assignedUsers", "Assigned Users")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {scenario?.users && scenario?.users.length > 0 ? (
                        scenario?.users.map((userId, index) => {
                          // Find user info without type checking
                          const usersList = users as any[];
                          const userInfo = usersList.find(
                            (u) => Number(u.id) === Number(userId),
                          );
                          const displayName = userInfo
                            ? `${userInfo.name} (${userInfo.email})`
                            : `User ${userId}`;

                          return (
                            <span
                              key={index}
                              className="rounded-full bg-blue-500 bg-opacity-10 px-3 py-1 text-sm text-blue-500"
                            >
                              {displayName}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-gray-500">
                          {t("scenarios.noUsersAssigned", "No users assigned")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        {t("scenarios.status")}
                      </h4>
                      <span className="text-sm text-black dark:text-white">
                        {scenario?.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        {t("scenarios.createdAt")}
                      </h4>
                      <span className="text-sm text-black dark:text-white">
                        {new Date(scenario?.created_at || "").toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {scenario?.timeLimit && (
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        {t("scenarios.timeLimit", "Time Limit")}
                      </h4>
                      <span className="text-sm text-black dark:text-white">
                        {scenario?.timeLimit}{" "}
                        {t("scenarios.minutes", "minutes")}
                      </span>
                    </div>
                  )}

                  {timeInfo && (
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        {t("scenarios.timeUsage", "Time Usage")}
                      </h4>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm text-black dark:text-white">
                          <span className="font-semibold">
                            {t("scenarios.usedTime", "Used")}:
                          </span>{" "}
                          {formatTime(timeInfo.total_elapsed_time)}(
                          {Math.round(
                            (timeInfo.total_elapsed_time /
                              (timeInfo.time_limit * 60)) *
                              100,
                          )}
                          %)
                        </div>
                        <div className="text-sm text-black dark:text-white">
                          <span className="font-semibold">
                            {t("scenarios.remainingTime", "Remaining")}:
                          </span>{" "}
                          {formatTime(timeInfo.remaining_time)}
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className={`h-2.5 rounded-full ${
                              timeInfo.remaining_time >
                              timeInfo.time_limit * 60 * 0.5
                                ? "bg-green-600"
                                : timeInfo.remaining_time >
                                    timeInfo.time_limit * 60 * 0.2
                                  ? "bg-yellow-500"
                                  : "bg-red-600"
                            }`}
                            style={{
                              width: `${Math.min(100, (timeInfo.total_elapsed_time / (timeInfo.time_limit * 60)) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-black dark:text-white mb-2">
                      {t("scenarios.context")}
                    </h4>
                    <p className="text-sm text-black dark:text-white">
                      {scenario?.context}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {scenario?.aspects && scenario?.aspects.length > 0 && (
                      <div>
                        <h4 className="font-medium text-black dark:text-white mb-2">
                          {t("scenarios.aspects")}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {scenario?.aspects.split(",").map((aspect, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-primary bg-opacity-10 px-3 py-1 text-sm text-primary"
                            >
                              {aspect.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {scenario?.categories &&
                      scenario?.categories.length > 0 && (
                        <div>
                          <h4 className="font-medium text-black dark:text-white mb-2">
                            {t("scenarios.categories")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {scenario?.categories
                              .split(",")
                              .map((category, index) => (
                                <span
                                  key={index}
                                  className="rounded-full bg-orange-500 bg-opacity-10 px-3 py-1 text-sm text-orange-500"
                                >
                                  {category}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                  {scenario?.files && scenario?.files.length > 0 && (
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        {t("scenarios.attachFiles")}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {scenario?.files.map((file, index) => (
                          <a
                            key={index}
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-md bg-gray-2 px-3 py-1.5 text-sm font-medium text-black hover:bg-opacity-90 dark:bg-meta-4 dark:text-white"
                          >
                            <span>File {index + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {scenario?.generated_image_url &&
                    scenario?.show_image_prompt && (
                      <div>
                        <h4 className="font-medium text-black dark:text-white mb-2">
                          Generated Image
                        </h4>
                        <img
                          src={scenario?.generated_image_url}
                          alt="Generated"
                          className="w-full max-w-md rounded-lg"
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Chat Console Card */}
        {/* <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              {t("scenarios.chatConsoleDetails")}
            </h3>
          </div>
          <div className="p-6.5">
            <ConsolePage aspects={aspects} context={context} />
          </div>
        </div> */}

        {/* Interactive Avatar Card */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              {t("scenarios.interactiveAvatar")}
            </h3>
          </div>
          <div className="p-6.5 relative">
            <InteractiveAvatar
              scenarioId={parseInt(id || "0")}
              scenarioTitle={scenario?.title || ""}
              currentUser={
                currentUser
                  ? {
                      id: currentUser.id!,
                      name: currentUser.name,
                      email: currentUser.email,
                      role: currentUser.role,
                    }
                  : null
              }
              onTimeUpdate={refreshTimeInfo}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioDetail;
