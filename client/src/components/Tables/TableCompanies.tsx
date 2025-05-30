import { useNavigate } from "react-router-dom";
import { useCompanies } from "../../context/CompanyContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { Company } from "../../api/companies.api";

const TableCompanies = ({ companies }: { companies: Company[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteCompany } = useCompanies();
  const { currentUser } = useUsers();

  // Filter companies based on role
  const filteredCompanies = companies.filter((company: Company) => {
    if (currentUser?.role === "admin") {
      return true; // Admin sees all companies
    }
    if (currentUser?.role === "company") {
      return company.created_by === Number(currentUser?.id); // Company sees companies they created
    }
    return false; // Regular users don't see the companies table
  });

  const handleEdit = (e: React.MouseEvent, companyId: number) => {
    e.preventDefault();
    navigate(`/companies/edit/${companyId}`);
  };

  const handleDelete = async (e: React.MouseEvent, companyId: number) => {
    e.preventDefault();

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
        await deleteCompany(companyId);
        Swal.fire({
          title: "¡Eliminado!",
          text: "La empresa ha sido eliminada.",
          icon: "success",
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar la empresa.",
          icon: "error",
        });
      }
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        Companies
      </h4>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
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

        {filteredCompanies.map((company: Company, key: number) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-5 ${
              key === filteredCompanies.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
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
                        {dept.name}
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
      </div>
    </div>
  );
};

export default TableCompanies;
