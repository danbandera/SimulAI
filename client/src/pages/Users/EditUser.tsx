import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useCompanies } from "../../context/CompanyContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Select, { SingleValue } from "react-select";

interface UserOption {
  value: number;
  label: string;
}
interface RoleOption {
  value: string;
  label: string;
}
interface CompanyOption {
  value: number;
  label: string;
}
interface DepartmentOption {
  value: number;
  label: string;
}

const EditUser: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { updateUser, getUser, users, getUsers, currentUser } = useUsers();
  const { companies, getCompanies } = useCompanies();
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    company_id: undefined as number | undefined,
    department_ids: [] as number[],
    email: "",
    role: "",
    created_by: 0,
    password: "",
    users: [] as number[],
  });

  const [availableDepartments, setAvailableDepartments] = useState<
    DepartmentOption[]
  >([]);

  const userOptions: UserOption[] = users
    .filter((user) => {
      // Only show regular users
      if (user.role !== "user") return false;

      // If creating a company user, only show users that can be assigned
      if (formData.role === "company") {
        // Show users without a company (only if they are part of the same company) or users from different companies
        return (
          !user.company_id ||
          (user.company_id && user.company_id === formData.company_id)
        );
      }

      return true;
    })
    .map((user) => ({
      value: user.id || 0,
      label: `${user.name} ${user.lastname}`,
    }));

  // Filter companies based on user role
  const companyOptions: CompanyOption[] =
    currentUser?.role === "admin"
      ? companies.map((company) => ({
          value: company.id || 0,
          label: company.name,
        }))
      : []; // Company users can't change company

  const handleUserSelect = (selectedOptions: readonly UserOption[]) => {
    setFormData({
      ...formData,
      users: selectedOptions.map((option) => option.value),
    });
  };

  const roleOptions: RoleOption[] = [
    { value: "user", label: t("users.user") },
    { value: "company", label: t("users.company") },
    { value: "admin", label: t("users.admin") },
  ];

  const handleRoleChange = (selectedOption: SingleValue<any>) => {
    setFormData({
      ...formData,
      role: selectedOption?.value || "",
    });
  };

  const handleCompanyChange = (selectedOption: SingleValue<CompanyOption>) => {
    const companyId = selectedOption?.value;
    setFormData({
      ...formData,
      company_id: companyId,
      department_ids: [], // Reset departments when company changes
    });

    // Update available departments based on selected company
    if (companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId);
      if (selectedCompany) {
        const departmentOptions = selectedCompany.departments.map((dept) => ({
          value: dept.id || 0,
          label: dept.name,
        }));
        setAvailableDepartments(departmentOptions);
      }
    } else {
      setAvailableDepartments([]);
    }
  };

  const handleDepartmentChange = (
    selectedOptions: readonly DepartmentOption[],
  ) => {
    setFormData({
      ...formData,
      department_ids: selectedOptions.map((option) => option.value),
    });
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUser(Number(id));
        const associatedUsers = users
          .filter((user) => user.created_by === Number(id))
          .map((user) => user.id || 0);

        setFormData({
          name: userData.name,
          lastname: userData.lastname,
          company_id: userData.company_id,
          department_ids: userData.department_ids || [],
          email: userData.email,
          role: userData.role,
          created_by: userData.created_by,
          password: "", // Don't load the password
          users: associatedUsers,
        });

        // Set available departments if user has a company
        if (userData.company_id && companies.length > 0) {
          const selectedCompany = companies.find(
            (c) => c.id === userData.company_id,
          );
          if (selectedCompany) {
            const departmentOptions = selectedCompany.departments.map(
              (dept) => ({
                value: dept.id || 0,
                label: dept.name,
              }),
            );
            setAvailableDepartments(departmentOptions);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        toast.error("Error loading user");
        navigate("/users");
      }
    };

    if (companies.length > 0) {
      loadUser();
    }
    getUsers();
    getCompanies();
  }, []);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Prepare user data
      const userData = { ...formData };

      // For company users, ensure they cannot change the company assignment
      if (currentUser?.role === "company") {
        userData.company_id = currentUser.company_id;
        // Company users can only edit regular users, not change roles
        if (userData.role !== "user") {
          userData.role = "user";
        }
      }

      // Validate role assignment - only admins can assign company/admin roles
      if (userData.role === "company" || userData.role === "admin") {
        if (currentUser?.role !== "admin") {
          toast.error("Only administrators can assign company or admin roles");
          return;
        }
      }

      if (formData.role === "company" && currentUser?.role === "admin") {
        await Promise.all(
          formData.users.map(async (userId) => {
            const userToUpdate = await getUser(userId);
            if (userToUpdate) {
              // Only update if the user is not already assigned to this company
              if (userToUpdate.company_id !== userData.company_id) {
                await updateUser(userId, {
                  ...userToUpdate,
                  created_by: Number(id),
                  company_id: userData.company_id, // Update company to match the user they're assigned to
                  department_ids: [], // Clear departments since they're moving to a different company
                });
              } else {
                // Just update the created_by if they're already in the same company
                await updateUser(userId, {
                  ...userToUpdate,
                  created_by: Number(id),
                });
              }
            }
          }),
        );
      }
      await updateUser(Number(id), userData);
      toast.success("User updated successfully!");
      navigate("/users");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error updating user");
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("users.editUser")} />

      <div className="grid grid-cols-1 gap-12">
        <div className="flex flex-col gap-12">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {t("users.editUser")}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.name")}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter user name"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      required
                    />
                  </div>

                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.lastname")}
                    </label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleChange}
                      placeholder="Enter user last name"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  {/* Company selection - Only for Admin */}
                  {currentUser?.role === "admin" && (
                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        {t("users.company")}
                      </label>
                      <Select
                        options={companyOptions}
                        onChange={handleCompanyChange}
                        value={companyOptions.find(
                          (option) => option.value === formData.company_id,
                        )}
                      />
                    </div>
                  )}

                  {/* Department selection - For all users who can edit users */}
                  <div
                    className={`w-full ${currentUser?.role === "admin" ? "xl:w-1/2" : ""}`}
                  >
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.department")}
                    </label>
                    <Select
                      options={availableDepartments}
                      onChange={handleDepartmentChange}
                      value={availableDepartments.filter((option) =>
                        formData.department_ids.includes(option.value),
                      )}
                      isMulti={true}
                    />
                  </div>
                </div>
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.email")}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      required
                    />
                  </div>
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.passwordEdit")}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  {/* Role selection - Only for Admin */}
                  {currentUser?.role === "admin" && (
                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        {t("users.role")}
                      </label>
                      <Select<RoleOption>
                        options={roleOptions}
                        onChange={handleRoleChange}
                        value={roleOptions.find(
                          (option) => option.value === formData.role,
                        )}
                      />
                    </div>
                  )}
                  {formData.role === "company" &&
                    currentUser?.role === "admin" && (
                      <div className="w-full xl:w-1/2">
                        <label className="mb-2.5 block text-black dark:text-white">
                          {t("scenarios.selectUsers")}
                        </label>
                        <Select
                          options={userOptions}
                          onChange={handleUserSelect}
                          isMulti={true}
                          className="react-select-container"
                          classNamePrefix="react-select"
                          placeholder={t("scenarios.selectUsers")}
                          value={userOptions.filter((option) =>
                            formData.users.includes(option.value),
                          )}
                        />
                      </div>
                    )}
                </div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  {t("users.updateUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditUser;
