import { useNavigate } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useCompanies } from "../../context/CompanyContext";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

interface SearchFiltersProps {
  onFilterChange: (filters: {
    search: string;
    company: string;
    department: string;
    role: string;
  }) => void;
  companies: any[];
  currentUser: any;
}

const SearchFilters = ({
  onFilterChange,
  companies,
  currentUser,
}: SearchFiltersProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    company: "",
    department: "",
    role: "",
  });
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);

  const isAdmin = currentUser?.role === "admin";
  const isCompanyOrAdmin =
    currentUser?.role === "admin" || currentUser?.role === "company";

  useEffect(() => {
    // Update available departments when company filter changes
    if (filters.company) {
      // Admin has selected a specific company
      const selectedCompany = companies.find(
        (c) => c.id === parseInt(filters.company),
      );
      if (selectedCompany) {
        setAvailableDepartments(selectedCompany.departments || []);
      }
    } else if (isCompanyOrAdmin && !isAdmin) {
      // For company users, show departments from their assigned company
      const userCompany = companies.find(
        (c) => c.id === currentUser?.company_id,
      );
      if (userCompany) {
        setAvailableDepartments(userCompany.departments || []);
      }
    } else {
      // No company selected or no valid context - empty departments
      setAvailableDepartments([]);
    }
  }, [filters.company, companies, currentUser, isAdmin, isCompanyOrAdmin]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };

    // Reset department when company changes
    if (name === "company") {
      newFilters.department = "";
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          name="search"
          placeholder={t(
            "users.searchPlaceholder",
            "Search by name or email...",
          )}
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

      {/* Company Filter - Only for Admin */}
      {isAdmin && (
        <div className="relative">
          <select
            name="company"
            value={filters.company}
            onChange={handleChange}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          >
            <option value="">{t("users.allCompanies", "All Companies")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Department Filter - For Admin and Company */}
      {isCompanyOrAdmin && (
        <div className="relative">
          <select
            name="department"
            value={filters.department}
            onChange={handleChange}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          >
            <option value="">
              {t("users.allDepartments", "All Departments")}
            </option>
            {availableDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
                {isAdmin &&
                  department.company_name &&
                  ` (${department.company_name})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Role Filter */}
      {isAdmin && (
        <div className="relative">
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
          >
            <option value="">{t("users.allRoles", "All Roles")}</option>
            <option value="user">{t("users.user", "User")}</option>
            <option value="company">{t("users.company", "Company")}</option>
            <option value="admin">{t("users.admin", "Admin")}</option>
          </select>
        </div>
      )}
    </div>
  );
};

const TableUsers = ({ users }: { users: any }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteUser } = useUsers();
  const { currentUser } = useUsers();
  const { companies, getCompanies } = useCompanies();
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedUsers, setPaginatedUsers] = useState<any[]>([]);

  useEffect(() => {
    getCompanies();
  }, []);

  useEffect(() => {
    // Initial filtering
    filterUsers({
      search: "",
      company: "",
      department: "",
      role: "",
    });
  }, [users, currentUser, companies]);

  // Update pagination when filtered users change
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex));
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredUsers.length]);

  // Helper function to get company name
  const getCompanyName = (companyId: number) => {
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : "N/A";
  };

  // Helper function to get department names
  const getDepartmentNames = (companyId: number, departmentIds: number[]) => {
    const company = companies.find((c) => c.id === companyId);
    if (company && departmentIds && departmentIds.length > 0) {
      const departmentNames = departmentIds
        .map((deptId) => {
          const department = company.departments.find((d) => d.id === deptId);
          return department ? department.name : null;
        })
        .filter(Boolean);
      return departmentNames.length > 0 ? departmentNames.join(", ") : "N/A";
    }
    return "N/A";
  };

  const filterUsers = (filters: {
    search: string;
    company: string;
    department: string;
    role: string;
  }) => {
    let filtered = users.filter((user: any) => {
      if (currentUser?.role === "admin") {
        return true; // Admin sees all users
      }
      if (currentUser?.role === "company") {
        return user.created_by === Number(currentUser?.id); // Company sees users they created
      }
      return false; // Regular users don't see the users table
    });

    // Apply search filter (name, lastname, email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (user: any) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.lastname.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          `${user.name} ${user.lastname}`.toLowerCase().includes(searchLower),
      );
    }

    // Apply company filter (admin only)
    if (filters.company && currentUser?.role === "admin") {
      filtered = filtered.filter(
        (user: any) => user.company_id === parseInt(filters.company),
      );
    }

    // Apply department filter (admin and company)
    if (
      filters.department &&
      (currentUser?.role === "admin" || currentUser?.role === "company")
    ) {
      filtered = filtered.filter((user: any) => {
        if (!user.department_ids || user.department_ids.length === 0) {
          return false;
        }

        // For company users, also ensure the user belongs to the same company
        if (currentUser?.role === "company") {
          return (
            user.company_id === currentUser?.company_id &&
            user.department_ids.includes(parseInt(filters.department))
          );
        }

        // For admin users
        return user.department_ids.includes(parseInt(filters.department));
      });
    }

    // Apply role filter
    if (filters.role) {
      filtered = filtered.filter((user: any) => user.role === filters.role);
    }

    // Sort by created_at
    filtered.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setFilteredUsers(filtered);
  };

  const handleEdit = (e: React.MouseEvent, userId: number) => {
    e.preventDefault(); // Prevent the Link navigation
    navigate(`/users/edit/${userId}`);
  };

  const handleDelete = async (e: React.MouseEvent, userId: number) => {
    e.preventDefault(); // Prevent the Link navigation

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
        await deleteUser(userId);
        Swal.fire({
          title: t("alerts.deleteSuccessTitle"),
          text: t("alerts.userDeletedMessage"),
          icon: "success",
          confirmButtonColor: "#3C50E0",
        });
      } catch (error) {
        Swal.fire({
          title: t("alerts.deleteErrorTitle"),
          text: t("alerts.userDeleteErrorMessage"),
          icon: "error",
          confirmButtonColor: "#D34053",
        });
      }
    }
  };

  // Pagination helper functions
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredUsers.length);

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
        {t("users.title")}
      </h4>

      <SearchFilters
        onFilterChange={filterUsers}
        companies={companies}
        currentUser={currentUser}
      />

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-6">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("users.name")}
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("users.email")}
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {currentUser?.role === "admin"
                ? t("users.companyDepartment")
                : t("users.department")}
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("users.role")}
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("users.edit")}
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              {t("users.delete")}
            </h5>
          </div>
        </div>

        {paginatedUsers.map((user: any, key: any) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-6 ${
              key === paginatedUsers.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <p className="hidden text-black dark:text-white sm:block">
                {user.name} {user.lastname}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">{user.email}</p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white text-sm">
                {currentUser?.role === "admin" ? (
                  // Admin sees company and department
                  <>
                    {user.company_id ? getCompanyName(user.company_id) : "N/A"}
                    {user.company_id &&
                      user.department_ids &&
                      user.department_ids.length > 0 && (
                        <>
                          <br />
                          <span className="text-xs text-gray-500">
                            {getDepartmentNames(
                              user.company_id,
                              user.department_ids,
                            )}
                          </span>
                        </>
                      )}
                  </>
                ) : (
                  // Company users see only department
                  <>
                    {user.company_id &&
                    user.department_ids &&
                    user.department_ids.length > 0
                      ? getDepartmentNames(user.company_id, user.department_ids)
                      : "N/A"}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-meta-3">{user.role}</p>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleEdit(e, user.id)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                {t("users.edit")}
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleDelete(e, user.id)}
                className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                {t("users.delete")}
              </Link>
            </div>
          </div>
        ))}

        {/* No users message */}
        {filteredUsers.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t("users.noUsers", "No users found")}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
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
            {filteredUsers.length} {t("pagination.entries", "entries")}
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

export default TableUsers;
