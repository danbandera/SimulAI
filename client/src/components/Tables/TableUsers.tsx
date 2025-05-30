import { useNavigate } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useCompanies } from "../../context/CompanyContext";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const TableUsers = ({ users }: { users: any }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteUser } = useUsers();
  const { currentUser } = useUsers();
  const { companies, getCompanies } = useCompanies();

  useEffect(() => {
    getCompanies();
  }, []);

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

  // Filter users based on role
  const filteredUsers = users.filter((user: any) => {
    if (currentUser?.role === "admin") {
      return true; // Admin sees all users
    }
    if (currentUser?.role === "company") {
      return user.created_by === Number(currentUser?.id); // Company sees users they created
    }
    return false; // Regular users don't see the users table
  });

  const handleEdit = (e: React.MouseEvent, userId: number) => {
    e.preventDefault(); // Prevent the Link navigation
    navigate(`/users/edit/${userId}`);
  };

  const handleDelete = async (e: React.MouseEvent, userId: number) => {
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
        await deleteUser(userId);
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

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        {t("users.title")}
      </h4>

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
              Company/Department
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

        {filteredUsers.map((user: any, key: any) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-6 ${
              key === filteredUsers.length - 1
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
      </div>
    </div>
  );
};

export default TableUsers;
