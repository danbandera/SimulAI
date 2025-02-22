import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { ConsolePage } from "./ConsolePage";
import Swal from "sweetalert2";

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
  aspects?: { value: string; label: string }[];
  files?: string[];
}

const ScenarioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getScenario, deleteScenario } = useScenarios();
  const { currentUser } = useUsers();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  console.log(scenario);
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

  const handleEdit = () => {
    navigate(`/scenarios/edit/${id}`);
  };

  const handleDuplicate = () => {
    navigate("/scenarios/new", {
      state: {
        duplicateData: {
          title: scenario?.title,
          description: scenario?.description,
          status: scenario?.status,
        },
      },
    });
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "No podrás revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3C50E0",
      cancelButtonColor: "#D34053",
    });

    if (result.isConfirmed && id) {
      try {
        await deleteScenario(parseInt(id));
        Swal.fire({
          title: "¡Eliminado!",
          text: "El escenario ha sido eliminado.",
          icon: "success",
        });
        navigate("/scenarios");
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar el escenario.",
          icon: "error",
        });
      }
    }
  };

  if (!scenario) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Breadcrumb pageName={scenario.title} />

      <div className="grid grid-cols-1 gap-9">
        {/* Scenario Details Card */}
        {!(currentUser?.role === "user") && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-black dark:text-white">
                  Scenario Details
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/scenarios/${id}/conversations`)}
                    className="inline-flex items-center justify-center rounded-md bg-green-700 py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    View Conversations
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="inline-flex items-center justify-center rounded-md bg-meta-3 py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-white hover:bg-opacity-90"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6.5">
              <div className="mb-4.5">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        Status
                      </h4>
                      <span className="text-sm text-black dark:text-white">
                        {scenario.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        Created At
                      </h4>
                      <span className="text-sm text-black dark:text-white">
                        {new Date(scenario.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-black dark:text-white mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-black dark:text-white">
                      {scenario.description}
                    </p>
                  </div>
                  {scenario.aspects && scenario.aspects.length > 0 && (
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        Aspects to Evaluate
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {scenario.aspects.map((aspect, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-primary bg-opacity-10 px-3 py-1 text-sm text-primary"
                          >
                            {aspect.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {scenario.files && scenario.files.length > 0 && (
                    <div>
                      <h4 className="font-medium text-black dark:text-white mb-2">
                        Attached Files
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {scenario.files.map((file, index) => (
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
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Chat Console Card */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Chat Console
            </h3>
          </div>
          <div className="p-6.5">
            <ConsolePage />
          </div>
        </div>
      </div>
    </>
  );
};

export default ScenarioDetail;
