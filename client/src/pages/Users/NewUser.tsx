import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import SelectRole from "../../components/Forms/SelectGroup/SelectRole";
import { toast } from "react-hot-toast";
import { generateRandomPassword } from "../../utils/passwordUtils";
import { sendEmail } from "../../api/email.api";
import { useTranslation } from "react-i18next";
const NewUser: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createUser } = useUsers();
  const { currentUser } = useUsers();
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    department: "",
    email: "",
    role: "",
  });

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
      // Generate random password
      const password = generateRandomPassword();

      // Create user with generated password
      await createUser({
        ...formData,
        password,
        created_by: Number(currentUser?.id),
      });

      // Send welcome email with password
      await sendEmail({
        email: formData.email,
        subject: "Welcome to SimulAI - Your Account Details",
        message: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Welcome ${formData.name} ${formData.lastname}!</h2>
            <p>Your account has been created successfully.</p>
            <p><strong>Your login credentials:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${formData.email}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>
            <!--<p style="color: #ff0000;">Important: Please change your password after your first login.</p>-->
            <p>Best regards,<br>SimulAI Team</p>
          </div>
        `,
      });

      toast.success("User created and credentials sent successfully!");
      navigate("/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Error creating user");
    }
  };

  return (
    <>
      <Breadcrumb pageName={t("users.newUser")} />

      <div className="grid grid-cols-1 gap-12">
        <div className="flex flex-col gap-12">
          {/* <!-- Contact Form --> */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                {t("users.newUser")}
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
                      placeholder="Enter email address"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4.5">
                  <SelectRole value={formData.role} onChange={handleChange} />
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  {t("users.createUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewUser;
