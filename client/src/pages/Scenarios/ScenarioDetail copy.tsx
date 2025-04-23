import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Scenario {
  id: number;
  title: string;
  context: string;
  status: string;
  assigned_user: User;
  created_by: User;
  created_at: string;
  updated_at?: string;
}

const ScenarioDetail = () => {
  const { id } = useParams();
  const { getScenario } = useScenarios();
  const [scenario, setScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    const loadScenario = async () => {
      if (id) {
        try {
          const data = await getScenario(parseInt(id));
          if (data) {
            setScenario(data);
          }
        } catch (error) {
          console.error("Error loading scenario:", error);
        }
      }
    };
    loadScenario();
  }, [id, getScenario]);

  if (!scenario) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Breadcrumb pageName={`Scenario: ${scenario.title}`} />

      <div className="grid grid-cols-1 gap-9">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Scenario Details
              </h3>
            </div>
            <div className="p-6.5">
              <div className="mb-4.5">
                <h4 className="mb-2.5 text-lg font-semibold text-black dark:text-white">
                  {scenario.title}
                </h4>
                <p className="text-sm text-black dark:text-white">
                  {scenario.context}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="mb-2.5 text-sm font-medium text-black dark:text-white">
                    Status
                  </h5>
                  <p className="text-sm text-meta-3">{scenario.status}</p>
                </div>

                <div>
                  <h5 className="mb-2.5 text-sm font-medium text-black dark:text-white">
                    Created At
                  </h5>
                  <p className="text-sm text-black dark:text-white">
                    {new Date(scenario.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h5 className="mb-2.5 text-sm font-medium text-black dark:text-white">
                    Assigned To
                  </h5>
                  <p className="text-sm text-black dark:text-white">
                    {scenario.assigned_user?.name || "Unassigned"}
                  </p>
                </div>

                <div>
                  <h5 className="mb-2.5 text-sm font-medium text-black dark:text-white">
                    Created By
                  </h5>
                  <p className="text-sm text-black dark:text-white">
                    {scenario.created_by?.name || "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioDetail;
