import { useNavigate, useLocation } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useUsers } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
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
  users: number[];
  created_by: User;
  created_at: string;
  updated_at?: string;
  aspects?: string;
  files?: string[];
  generated_image_url?: string;
}

const TableScenarios = ({ scenarios }: { scenarios: Scenario[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteScenario } = useScenarios();
  const { currentUser } = useUsers();

  const isAdmin = currentUser?.role === "admin";

  // Filter scenarios based on user role
  const filteredScenarios = scenarios
    .filter((scenario) => {
      if (!currentUser) return false;

      if (currentUser?.role === "admin") {
        return true; // Admin sees all scenarios
      }

      if (currentUser?.role === "company") {
        return scenario.created_by.id === Number(currentUser?.id); // Company sees only their created scenarios
      }

      // Regular user only sees scenarios they're explicitly assigned to
      const userId = Number(currentUser?.id);

      // Check if user is in the users array
      if (scenario.users && Array.isArray(scenario.users)) {
        return scenario.users.includes(userId);
      }

      return false; // User not assigned to this scenario
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
          context: scenario.context,
          status: scenario.status,
        },
      },
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        {t("scenarios.title")}
      </h4>

      <div className="flex flex-col">
        <div
          className={`grid rounded-sm bg-gray-2 dark:bg-meta-4 gap-2 ${
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("scenarios.title")}
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("scenarios.assignedTo", "Assigned to")}
            </h5>
          </div>
          {isAdmin && (
            <div className="p-2.5 text-center xl:p-5">
              <h5 className="text-sm font-medium uppercase xsm:text-base">
                {t("scenarios.createdBy")}
              </h5>
            </div>
          )}
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("scenarios.details")}
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

            <div className="flex items-center gap-3">
              {scenario.users && scenario.users.length > 0 ? (
                <span>
                  {scenario.users.length}{" "}
                  {scenario.users.length === 1 ? "user" : "users"}
                </span>
              ) : (
                <span className="text-gray-400">
                  {t("scenarios.notAssigned", "Not assigned")}
                </span>
              )}
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
                {t("scenarios.details")}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableScenarios;
