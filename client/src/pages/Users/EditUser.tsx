import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
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

const EditUser: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { updateUser, getUser, users, getUsers } = useUsers();
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    department: "",
    email: "",
    role: "",
    created_by: 0,
    password: "",
    users: [] as number[],
  });

  const userOptions: UserOption[] = users
    .filter((user) => user.role === "user")
    .map((user) => ({
      value: user.id || 0,
      label: `${user.name} ${user.lastname}`,
    }));

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
          department: userData.department || "",
          email: userData.email,
          role: userData.role,
          created_by: userData.created_by,
          password: "", // Don't load the password
          users: associatedUsers,
        });
      } catch (error) {
        console.error("Error loading user:", error);
        toast.error("Error loading user");
        navigate("/users");
      }
    };

    loadUser();
    getUsers();
  }, [id]);
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
      if (formData.role === "company") {
        await Promise.all(
          formData.users.map(async (userId) => {
            const userToUpdate = await getUser(userId);
            if (userToUpdate) {
              await updateUser(userId, {
                ...userToUpdate,
                created_by: Number(id),
              });
            }
          }),
        );
      }
      await updateUser(Number(id), formData);
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
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      {t("users.department")}
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Enter user department"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

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
                </div>
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
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
                  {formData.role === "company" && (
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
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
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
