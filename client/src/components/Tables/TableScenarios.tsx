import { Link } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useScenarios } from "../../context/ScenarioContext";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { getSettings } from "../../api/settings.api";
import Swal from "sweetalert2";

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
  const { bulkDeleteScenarios } = useScenarios();
  const { currentUser } = useUsers();
  const [filteredScenarios, setFilteredScenarios] = useState<Scenario[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedScenarios, setPaginatedScenarios] = useState<Scenario[]>([]);

  // Bulk selection state
  const [selectedScenarios, setSelectedScenarios] = useState<Set<number>>(
    new Set(),
  );
  const [selectAll, setSelectAll] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const canBulkDelete =
    currentUser?.role === "admin" || currentUser?.role === "company";

  useEffect(() => {
    // Initial filtering
    filterScenarios({
      search: "",
      user: "",
      category: "",
      status: "",
    });
  }, [scenarios, currentUser]);

  // Update pagination when filtered scenarios change
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedScenarios(filteredScenarios.slice(startIndex, endIndex));
  }, [filteredScenarios, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredScenarios.length]);

  // Reset selections when scenarios change
  useEffect(() => {
    setSelectedScenarios(new Set());
    setSelectAll(false);
  }, [paginatedScenarios]);

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

      if (currentUser?.role === "user") {
        const userId = Number(currentUser?.id);
        const isAssigned =
          scenario.users &&
          Array.isArray(scenario.users) &&
          scenario.users.includes(userId);
        const isPublished = scenario.status === "published";
        return isAssigned && isPublished;
      }

      // Fallback for other roles
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

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedScenarios(new Set());
    } else {
      const currentPageScenarioIds = paginatedScenarios
        .filter((scenario) => canDeleteScenario(scenario))
        .map((scenario) => scenario.id);
      setSelectedScenarios(new Set(currentPageScenarioIds));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectScenario = (scenarioId: number) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(scenarioId)) {
      newSelected.delete(scenarioId);
    } else {
      newSelected.add(scenarioId);
    }
    setSelectedScenarios(newSelected);

    // Update select all state
    const selectableScenarios = paginatedScenarios.filter((scenario) =>
      canDeleteScenario(scenario),
    );
    const selectableIds = selectableScenarios.map((scenario) => scenario.id);
    const allSelectableSelected = selectableIds.every((id) =>
      newSelected.has(id),
    );
    setSelectAll(allSelectableSelected && selectableIds.length > 0);
  };

  const canDeleteScenario = (scenario: Scenario) => {
    if (currentUser?.role === "admin") {
      return true;
    }
    if (currentUser?.role === "company") {
      return scenario.created_by.id === Number(currentUser?.id);
    }
    return false;
  };

  const handleBulkDelete = async () => {
    if (selectedScenarios.size === 0) return;

    const result = await Swal.fire({
      title: t("scenarios.bulkDeleteConfirmTitle"),
      text: t("scenarios.bulkDeleteConfirmMessage", {
        count: selectedScenarios.size,
      }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3C50E0",
      cancelButtonColor: "#D34053",
      confirmButtonText: t("alerts.yes"),
      cancelButtonText: t("alerts.cancel"),
    });

    if (result.isConfirmed) {
      try {
        const scenarioIdsArray = Array.from(selectedScenarios);
        const response = await bulkDeleteScenarios(scenarioIdsArray);

        if (response.deleted > 0) {
          await Swal.fire({
            title: t("scenarios.bulkDeleteSuccessTitle"),
            text: t("scenarios.bulkDeleteSuccessMessage", {
              count: response.deleted,
            }),
            icon: "success",
            confirmButtonColor: "#3C50E0",
          });
        }

        if (response.denied > 0) {
          await Swal.fire({
            title: t("alerts.warning"),
            text: `${response.denied} scenarios could not be deleted due to insufficient permissions.`,
            icon: "warning",
            confirmButtonColor: "#3C50E0",
          });
        }

        // Reset selections
        setSelectedScenarios(new Set());
        setSelectAll(false);
      } catch (error: any) {
        Swal.fire({
          title: t("scenarios.bulkDeleteErrorTitle"),
          text: error.message || t("scenarios.bulkDeleteErrorMessage"),
          icon: "error",
          confirmButtonColor: "#D34053",
        });
      }
    }
  };

  // Pagination helper functions
  const totalPages = Math.ceil(filteredScenarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredScenarios.length,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="flex items-center justify-between mb-6 px-5">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          {t("scenarios.title")}
        </h4>

        {/* Bulk Delete Button */}
        {canBulkDelete && selectedScenarios.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedScenarios.size} {t("scenarios.selected")}
            </span>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              {t("scenarios.deleteSelected")}
            </button>
          </div>
        )}
      </div>

      <SearchFilters onFilterChange={filterScenarios} />

      <div className="flex flex-col">
        <div
          className={`grid rounded-sm bg-gray-2 dark:bg-meta-4 gap-2 ${
            canBulkDelete
              ? isAdmin
                ? "grid-cols-5"
                : "grid-cols-4"
              : isAdmin
                ? "grid-cols-4"
                : "grid-cols-3"
          }`}
        >
          {/* Select All Checkbox - Only for admin and company users */}
          {canBulkDelete && (
            <div className="p-2.5 xl:p-5">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm font-medium uppercase xsm:text-base">
                  {t("scenarios.selectAll")}
                </span>
              </div>
            </div>
          )}

          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("scenarios.title")}
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {currentUser?.role === "admin" || currentUser?.role === "company"
                ? t("scenarios.assignedTo", "Assigned to")
                : t("scenarios.status", "Status")}
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

        {paginatedScenarios.map((scenario, key) => (
          <div
            className={`grid gap-4 ${
              canBulkDelete
                ? isAdmin
                  ? "grid-cols-5"
                  : "grid-cols-4"
                : isAdmin
                  ? "grid-cols-4"
                  : "grid-cols-3"
            } ${
              key === paginatedScenarios.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            {/* Scenario Checkbox - Only for admin and company users */}
            {canBulkDelete && (
              <div className="flex items-center p-2.5 xl:p-5">
                <input
                  type="checkbox"
                  checked={selectedScenarios.has(scenario.id)}
                  onChange={() => handleSelectScenario(scenario.id)}
                  disabled={!canDeleteScenario(scenario)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
              </div>
            )}

            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <Link
                to={`/scenarios/${scenario.id}`}
                className="hidden text-blue-400 dark:text-white hover:text-primary dark:hover:text-primary sm:block"
              >
                {scenario.title}
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Only show user assignment info to admin and company users */}
              {currentUser?.role === "admin" ||
              currentUser?.role === "company" ? (
                scenario.users && scenario.users.length > 0 ? (
                  <span>
                    {scenario.users.length}{" "}
                    {scenario.users.length === 1 ? "user" : "users"}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {t("scenarios.notAssigned", "Not assigned")}
                  </span>
                )
              ) : (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    scenario.status === "published"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : scenario.status === "draft"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  }`}
                >
                  {t(`scenarios.${scenario.status}`, scenario.status)}
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

        {/* No scenarios message */}
        {filteredScenarios.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t("scenarios.noScenarios", "No scenarios found")}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredScenarios.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pagination.show", "Show")}
            </span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="rounded border border-stroke bg-transparent py-1 px-2 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pagination.entries", "entries")}
            </span>
          </div>

          {/* Results info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("pagination.showing", "Showing")} {startIndex}{" "}
            {t("pagination.to", "to")} {endIndex} {t("pagination.of", "of")}{" "}
            {filteredScenarios.length} {t("pagination.entries", "entries")}
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 text-sm border border-stroke rounded hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:hover:bg-meta-4"
              >
                ‹
              </button>

              {/* Page numbers */}
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() =>
                    typeof page === "number" && handlePageChange(page)
                  }
                  disabled={page === "..."}
                  className={`flex items-center justify-center w-8 h-8 text-sm border border-stroke rounded ${
                    page === currentPage
                      ? "bg-primary text-white border-primary"
                      : "hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                  } ${page === "..." ? "cursor-default" : ""}`}
                >
                  {page}
                </button>
              ))}

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 text-sm border border-stroke rounded hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:hover:bg-meta-4"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableScenarios;
