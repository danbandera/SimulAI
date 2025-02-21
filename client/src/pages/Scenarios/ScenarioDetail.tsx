import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { ConsolePage } from "./ConsolePage";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
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
            <div className="p-6.5">
              <ConsolePage />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioDetail;
