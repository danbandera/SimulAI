import { useNavigate } from "react-router-dom";
import { useCompanies } from "../../context/CompanyContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Company } from "../../api/companies.api";

interface SearchFiltersProps {
  onFilterChange: (filters: {
    search: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
}

const SearchFilters = ({ onFilterChange }: SearchFiltersProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          name="search"
          placeholder={t("companies.searchPlaceholder", "Search companies...")}
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

      {/* Date From Filter */}
      <div className="relative">
        <input
          type="date"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-4 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          placeholder={t("companies.dateFrom", "From date")}
        />
      </div>

      {/* Date To Filter */}
      <div className="relative">
        <input
          type="date"
          name="dateTo"
          value={filters.dateTo}
          onChange={handleChange}
          className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-4 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          placeholder={t("companies.dateTo", "To date")}
        />
      </div>
    </div>
  );
};

const TableCompanies = ({ companies }: { companies: Company[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteCompany } = useCompanies();
  const { currentUser } = useUsers();
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedCompanies, setPaginatedCompanies] = useState<Company[]>([]);

  useEffect(() => {
    // Initial filtering
    filterCompanies({
      search: "",
      dateFrom: "",
      dateTo: "",
    });
  }, [companies, currentUser]);

  // Update pagination when filtered companies change
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedCompanies(filteredCompanies.slice(startIndex, endIndex));
  }, [filteredCompanies, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCompanies.length]);

  const filterCompanies = (filters: {
    search: string;
    dateFrom: string;
    dateTo: string;
  }) => {
    let filtered = companies.filter((company: Company) => {
      if (currentUser?.role === "admin") {
        return true; // Admin sees all companies
      }
      if (currentUser?.role === "company") {
        return company.created_by === Number(currentUser?.id); // Company sees companies they created
      }
      return false; // Regular users don't see the companies table
    });

    // Apply search filter (company name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((company) =>
        company.name.toLowerCase().includes(searchLower),
      );
    }

    // Apply date from filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((company) => {
        if (!company.created_at) return false;
        const companyDate = new Date(company.created_at);
        return companyDate >= fromDate;
      });
    }

    // Apply date to filter
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter((company) => {
        if (!company.created_at) return false;
        const companyDate = new Date(company.created_at);
        return companyDate <= toDate;
      });
    }

    // Sort by created_at (newest first)
    filtered.sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    setFilteredCompanies(filtered);
  };

  const handleEdit = (e: React.MouseEvent, companyId: number) => {
    e.preventDefault();
    navigate(`/companies/edit/${companyId}`);
  };

  const handleDelete = async (e: React.MouseEvent, companyId: number) => {
    e.preventDefault();

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

    if (result.isConfirmed) {
      try {
        await deleteCompany(companyId);
        Swal.fire({
          title: t("alerts.deleteSuccessTitle"),
          text: t("alerts.companyDeletedMessage"),
          icon: "success",
          confirmButtonColor: "#3C50E0",
        });
      } catch (error) {
        Swal.fire({
          title: t("alerts.deleteErrorTitle"),
          text: t("alerts.companyDeleteErrorMessage"),
          icon: "error",
          confirmButtonColor: "#D34053",
        });
      }
    }
  };

  // Pagination helper functions
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredCompanies.length,
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
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        Companies
      </h4>

      <SearchFilters onFilterChange={filterCompanies} />

      <div className="flex flex-col">
        <div className="grid grid-cols-5 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-7">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">ID</h5>
          </div>
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Logo
            </h5>
          </div>
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Company Name
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Departments
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Created At
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Edit
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Delete
            </h5>
          </div>
        </div>

        {paginatedCompanies.map((company: Company, key: number) => (
          <div
            className={`grid grid-cols-5 sm:grid-cols-7 ${
              key === paginatedCompanies.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white font-medium">
                {company.id}
              </p>
            </div>

            <div className="flex items-center p-2.5 xl:p-5">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={`${company.name} logo`}
                  className="h-10 w-10 object-contain rounded"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    No Logo
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <p className="text-black dark:text-white">{company.name}</p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <div className="text-black dark:text-white">
                {company.departments && company.departments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {company.departments.map((dept, index) => (
                      <span
                        key={index}
                        className="inline-block bg-primary bg-opacity-10 text-primary rounded px-2 py-1 text-xs"
                      >
                        {dept.id} - {dept.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">No departments</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">
                {company.created_at
                  ? new Date(company.created_at).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleEdit(e, company.id!)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Edit
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleDelete(e, company.id!)}
                className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Delete
              </Link>
            </div>
          </div>
        ))}

        {/* No companies message */}
        {filteredCompanies.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t("companies.noCompanies", "No companies found")}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredCompanies.length > 0 && (
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
            {filteredCompanies.length} {t("pagination.entries", "entries")}
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

export default TableCompanies;
