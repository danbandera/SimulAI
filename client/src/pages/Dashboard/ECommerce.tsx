import React, { useEffect, useState } from "react";
import CardDataStats from "../../components/CardDataStats";
import ChartOne from "../../components/Charts/ChartOne";
import ChartThree from "../../components/Charts/ChartThree";
import ChartTwo from "../../components/Charts/ChartTwo";
import ChatCard from "../../components/Chat/ChatCard";
import MapOne from "../../components/Maps/MapOne";
import { useUsers } from "../../context/UserContext";
import { useScenarios } from "../../context/ScenarioContext";
import { Link } from "react-router-dom";
import {
  getReportsRequest,
  exportReportToPdfRequest,
  exportReportToWordRequest,
} from "../../api/scenarios.api";
import { useTranslation } from "react-i18next";
// import TableUsers from "../../components/Tables/TableUsers";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Scenario {
  id?: number;
  title: string;
  context: string;
  status: string;
  users?: number[];
  assigned_user?: User;
  created_by?: User | number;
  created_at?: string;
  updated_at?: string;
  aspects?: string | { value: string; label: string }[];
  categories?: string;
  files?: string[];
}

interface Report {
  id: number;
  title: string;
  content: string;
  conversations_ids: number[];
  show_to_user: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ScenarioWithReports extends Scenario {
  reports: Report[];
}

const ECommerce: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useUsers();
  const { scenarios, loadScenarios } = useScenarios();
  const [scenariosWithReports, setScenariosWithReports] = useState<
    ScenarioWithReports[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadScenarios();
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchReportsForScenarios = async () => {
      if (scenarios.length === 0) return;

      try {
        const scenariosWithReportsData = await Promise.all(
          scenarios.map(async (scenario) => {
            try {
              const reports = await getReportsRequest(scenario.id || 0);
              // Filter reports with show_to_user set to true
              const visibleReports = reports.filter(
                (report: Report) => report.show_to_user,
              );
              return {
                ...scenario,
                reports: visibleReports,
              } as ScenarioWithReports;
            } catch (error) {
              console.error(
                `Error fetching reports for scenario ${scenario.id}:`,
                error,
              );
              return {
                ...scenario,
                reports: [],
              } as ScenarioWithReports;
            }
          }),
        );
        setScenariosWithReports(scenariosWithReportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchReportsForScenarios();
  }, [scenarios]);

  const filteredScenarios = scenariosWithReports
    .filter((scenario) => {
      if (!currentUser) return false;

      if (currentUser.role === "admin") {
        return true; // Admin sees all scenarios
      }
      if (currentUser.role === "company") {
        // Check if created_by is a User object or a number
        if (
          typeof scenario.created_by === "object" &&
          scenario.created_by?.id
        ) {
          return scenario.created_by.id === Number(currentUser.id);
        } else if (typeof scenario.created_by === "number") {
          return scenario.created_by === Number(currentUser.id);
        }
        return false;
      }
      // Regular user only sees scenarios assigned to them
      return scenario.assigned_user?.id === Number(currentUser.id);
    })
    .sort((a, b) => {
      // Sort by created_at in descending order (newest first)
      return (
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
      );
    });

  const exportToPdf = (scenarioId: number, reportId: number) => {
    exportReportToPdfRequest(scenarioId, reportId);
  };

  const exportToWord = (scenarioId: number, reportId: number) => {
    exportReportToWordRequest(scenarioId, reportId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60">Loading...</div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4 md:gap-6 xl:gap-7.5">
        {filteredScenarios.map((scenario) => (
          <div key={scenario.id} className="col-span-3 grid grid-cols-3 gap-4">
            <Link to={`/scenarios/${scenario.id}`} className="col-span-1">
              <CardDataStats
                title={scenario.title}
                total={
                  scenario.reports && scenario.reports.length > 0
                    ? `${scenario.reports.length} ${t("scenarios.reportsAvailable")}`
                    : t("scenarios.noReportsAvailable")
                }
              />
            </Link>
            <div className="col-span-2">
              {scenario.reports && scenario.reports.length > 0 ? (
                <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4 h-full overflow-auto">
                  <h3 className="text-lg font-semibold mb-3">
                    Reportes disponibles
                  </h3>
                  <div className="space-y-3">
                    {scenario.reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-3 border rounded hover:bg-gray-50 dark:hover:bg-boxdark-2"
                      >
                        <h4 className="font-medium">{report.title}</h4>
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                          <span>
                            Creado:{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                exportToPdf(scenario.id || 0, report.id)
                              }
                              className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-opacity-90"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() =>
                                exportToWord(scenario.id || 0, report.id)
                              }
                              className="px-2 py-1 text-xs text-white bg-blue-700 rounded hover:bg-opacity-90"
                            >
                              Word
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4 h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="text-md font-medium text-gray-500 dark:text-gray-400">
                      No hay reportes disponibles
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Aún no se han generado reportes visibles para este
                      escenario
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        {/* Other components removed for brevity */}
      </div>
    </>
  );
};

export default ECommerce;
