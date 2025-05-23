import { useNavigate, useLocation } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useUsers } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { getSettings } from "../../api/settings.api";

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
  categories?: string;
}

interface SearchFiltersProps {
  onFilterChange: (filters: {
    search: string;
    user: string;
    category: string;
    status: string;
  }) => void;
}

const SearchFilters = ({ onFilterChange }: SearchFiltersProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    user: "",
    category: "",
    status: "",
  });
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const settings = await getSettings();
        if (settings.scenario_categories) {
          // Split the categories string into an array and trim whitespace
          const categoryList = settings.scenario_categories
            .split(",")
            .map((cat: string) => cat.trim())
            .filter((cat: string) => cat.length > 0);
          setCategories(categoryList);
        }
      } catch (error) {
        console.error("Error loading scenario categories:", error);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative">
        <input
          type="text"
          name="search"
          placeholder={t("scenarios.searchPlaceholder", "Search scenarios...")}
          value={filters.search}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.16666 3.33332C5.945 3.33332 3.33332 5.94499 3.33332 9.16666C3.33332 12.3883 5.945 15 9.16666 15C12.3883 15 15 12.3883 15 9.16666C15 5.94499 12.3883 3.33332 9.16666 3.33332ZM1.66666 9.16666C1.66666 5.02452 5.02452 1.66666 9.16666 1.66666C13.3088 1.66666 16.6667 5.02452 16.6667 9.16666C16.6667 13.3088 13.3088 16.6667 9.16666 16.6667C5.02452 16.6667 1.66666 13.3088 1.66666 9.16666Z"
              fill=""
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M13.2857 13.2857C13.6112 12.9603 14.1388 12.9603 14.4642 13.2857L18.0892 16.9107C18.4147 17.2362 18.4147 17.7638 18.0892 18.0892C17.7638 18.4147 17.2362 18.4147 16.9107 18.0892L13.2857 14.4642C12.9603 14.1388 12.9603 13.6112 13.2857 13.2857Z"
              fill=""
            />
          </svg>
        </span>
      </div>

      <div className="relative">
        <select
          name="user"
          value={filters.user}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        >
          <option value="">{t("scenarios.allUsers", "All Users")}</option>
          <option value="assigned">
            {t("scenarios.assignedToMe", "Assigned to me")}
          </option>
          <option value="created">
            {t("scenarios.createdByMe", "Created by me")}
          </option>
        </select>
      </div>

      <div className="relative">
        <select
          name="category"
          value={filters.category}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        >
          <option value="">
            {t("scenarios.allCategories", "All Categories")}
          </option>
          {categories.map((category, index) => (
            <option key={index} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <select
          name="status"
          value={filters.status}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        >
          <option value="">{t("scenarios.allStatus", "All Status")}</option>
          <option value="draft">{t("scenarios.draft", "Draft")}</option>
          <option value="published">
            {t("scenarios.published", "Published")}
          </option>
          <option value="archived">
            {t("scenarios.archived", "Archived")}
          </option>
        </select>
      </div>
    </div>
  );
};

const TableScenarios = ({ scenarios }: { scenarios: Scenario[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteScenario } = useScenarios();
  const { currentUser } = useUsers();
  const [filteredScenarios, setFilteredScenarios] = useState<Scenario[]>([]);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    // Initial filtering
    filterScenarios({
      search: "",
      user: "",
      category: "",
      status: "",
    });
  }, [scenarios, currentUser]);

  const filterScenarios = (filters: {
    search: string;
    user: string;
    category: string;
    status: string;
  }) => {
    let filtered = scenarios.filter((scenario) => {
      if (!currentUser) return false;

      if (currentUser?.role === "admin") {
        return true;
      }

      if (currentUser?.role === "company") {
        return scenario.created_by.id === Number(currentUser?.id);
      }

      const userId = Number(currentUser?.id);
      if (scenario.users && Array.isArray(scenario.users)) {
        return scenario.users.includes(userId);
      }

      return false;
    });

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (scenario) =>
          scenario.title.toLowerCase().includes(searchLower) ||
          scenario.context.toLowerCase().includes(searchLower),
      );
    }

    // Apply user filter
    if (filters.user) {
      const userId = Number(currentUser?.id);
      if (filters.user === "assigned") {
        filtered = filtered.filter(
          (scenario) => scenario.users && scenario.users.includes(userId),
        );
      } else if (filters.user === "created") {
        filtered = filtered.filter(
          (scenario) => scenario.created_by.id === userId,
        );
      }
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(
        (scenario) =>
          scenario.categories &&
          scenario.categories
            .toLowerCase()
            .includes(filters.category.toLowerCase()),
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(
        (scenario) =>
          scenario.status.toLowerCase() === filters.status.toLowerCase(),
      );
    }

    // Sort by created_at
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setFilteredScenarios(filtered);
  };

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

      <SearchFilters onFilterChange={filterScenarios} />

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
