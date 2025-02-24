import { useNavigate, useLocation } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useUsers } from "../../context/UserContext";
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

const TableScenarios = ({ scenarios }: { scenarios: Scenario[] }) => {
  const navigate = useNavigate();
  const { deleteScenario } = useScenarios();
  const { currentUser } = useUsers();

  const isAdmin = currentUser?.role === "admin";

  // Filter scenarios based on user role
  const filteredScenarios = scenarios
    .filter((scenario) => {
      if (currentUser?.role === "admin") {
        return true; // Admin sees all scenarios
      }
      if (currentUser?.role === "company") {
        return scenario.created_by.id === Number(currentUser?.id); // Company sees only their created scenarios
      }
      // Regular user only sees scenarios assigned to them
      return scenario.assigned_user?.id === Number(currentUser?.id);
    })
    .sort((a, b) => {
      // Sort by created_at in descending order (newest first)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  const handleEdit = (e: React.MouseEvent, scenarioId: number) => {
    e.preventDefault(); // Prevent the Link navigation
    navigate(`/scenarios/edit/${scenarioId}`);
  };

  const handleDelete = async (e: React.MouseEvent, scenarioId: number) => {
    e.preventDefault(); // Prevent the Link navigation

    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "No podrás revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3C50E0",
      cancelButtonColor: "#D34053",
    });

    if (result.isConfirmed) {
      try {
        await deleteScenario(scenarioId);
        Swal.fire({
          title: "¡Eliminado!",
          text: "El usuario ha sido eliminado.",
          icon: "success",
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar el usuario.",
          icon: "error",
        });
      }
    }
  };

  const handleConversations = (e: React.MouseEvent, scenarioId: number) => {
    e.preventDefault(); // Prevent the Link navigation
    navigate(`/scenarios/${scenarioId}/conversations`);
  };

  const handleDuplicate = (e: React.MouseEvent, scenario: Scenario) => {
    e.preventDefault();
    navigate("/scenarios/new", {
      state: {
        duplicateData: {
          title: scenario.title,
          description: scenario.description,
          status: scenario.status,
        },
      },
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        Scenarios
      </h4>

      <div className="flex flex-col">
        <div
          className={`grid rounded-sm bg-gray-2 dark:bg-meta-4 gap-2 ${
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Title
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Assigned To
            </h5>
          </div>
          {isAdmin && (
            <div className="p-2.5 text-center xl:p-5">
              <h5 className="text-sm font-medium uppercase xsm:text-base">
                Created By
              </h5>
            </div>
          )}
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Details
            </h5>
          </div>
        </div>

        {filteredScenarios.map((scenario, key) => (
          <div
            className={`grid gap-4 ${isAdmin ? "grid-cols-4" : "grid-cols-3"} ${
              key === filteredScenarios.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <Link
                to={`/scenarios/${scenario.id}`}
                className="hidden text-blue-400 dark:text-white hover:text-primary dark:hover:text-primary sm:block"
              >
                {scenario.title}
              </Link>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">
                {scenario.assigned_user?.name || "Unassigned"}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-black dark:text-white">
                  {scenario.created_by?.name || "Unknown"}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to={`/scenarios/${scenario.id}`}
                className="inline-flex items-center justify-center rounded-md bg-green-700 py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-4 xl:px-6"
              >
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableScenarios;
