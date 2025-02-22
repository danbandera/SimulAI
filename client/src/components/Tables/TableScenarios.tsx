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

  const columnsNumber = currentUser?.role === "admin" ? 9 : 8;

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
          className={`grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-${columnsNumber} gap-2`}
        >
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Title
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Description
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Status
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Assigned To
            </h5>
          </div>
          {currentUser?.role === "admin" && (
            <div className="p-2.5 text-center xl:p-5">
              <h5 className="text-sm font-medium uppercase xsm:text-base">
                Created By
              </h5>
            </div>
          )}
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Conversations
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Duplicate
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Editar
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Eliminar
            </h5>
          </div>
        </div>

        {filteredScenarios.map((scenario, key) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-${columnsNumber} gap-4 ${
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
                {scenario.description.slice(0, 100)}
                {scenario.description.length > 100 && "..."}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black">{scenario.status}</p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">
                {scenario.assigned_user?.name || "Unassigned"}
              </p>
            </div>

            {currentUser?.role === "admin" && (
              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-black dark:text-white">
                  {scenario.created_by?.name || "Unknown"}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to={"#"}
                onClick={(e) => handleConversations(e, scenario.id)}
                className="inline-flex items-center justify-center rounded-md bg-green-700 py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-4 xl:px-6"
              >
                Conversations
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleDuplicate(e, scenario)}
                className="inline-flex items-center justify-center rounded-md bg-meta-3 py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Duplicate
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleEdit(e, scenario.id)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Editar
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleDelete(e, scenario.id)}
                className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Eliminar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableScenarios;
