import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";
import { sendEmail } from "../../api/email.api";

interface UserOption {
  value: number;
  label: string;
}

const EditScenario = () => {
  const navigate = useNavigate();
  const { getScenario, updateScenario } = useScenarios();
  const { users, getUsers } = useUsers();
  const { currentUser } = useUsers();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    user: null as number | null,
  });
  // Transform users data for react-select
  const userOptions: UserOption[] = users
    .filter((user) =>
      currentUser?.role === "admin"
        ? true
        : user.created_by === currentUser?.id,
    )
    .map((user) => ({
      value: user.id!,
      label: `${user.name} (${user.email})`,
    }));

  useEffect(() => {
    getUsers();
  }, []);

  useEffect(() => {
    const loadScenario = async () => {
      const scenario = await getScenario(Number(id));
      setFormData({
        title: scenario.title,
        description: scenario.description,
        status: scenario.status,
        user: scenario.user_id_assigned,
      });
    };
    loadScenario();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserSelect = (selectedOption: SingleValue<UserOption>) => {
    setFormData((prev) => ({
      ...prev,
      user: selectedOption ? selectedOption.value : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.user) {
      toast.error("Please select a user");
      return;
    }
    try {
      await updateScenario(Number(id), {
        ...formData,
        users: [formData.user],
        created_by: Number(currentUser?.id),
      });

      // await sendEmail({
      //   email: selectedUser.email,
      //   subject: `New Scenario Assignment: ${formData.title}`,
      //   message: `
      //     <div style="font-family: Arial, sans-serif;">
      //       <h2>Hello ${selectedUser.name},</h2>
      //       <p>You have been assigned to a new scenario in SimulAI.</p>

      //       <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      //         <p><strong>Scenario:</strong> ${formData.title}</p>
      //         <p><strong>Description:</strong> ${formData.description || "No description provided"}</p>
      //       </div>

      //       <p>You can access this scenario from your dashboard.</p>
      //       <p>Best regards,<br>SimulAI Team</p>
      //     </div>
      //   `,
      // });

      toast.success("Scenario created successfully");
      navigate("/scenarios");
    } catch (error) {
      console.error("Error creating scenario:", error);
      toast.error("Error creating scenario");
    }
  };

  return (
    <>
      <Breadcrumb pageName="Edit Scenario" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Edit Scenario
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6.5">
                <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Title <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter scenario title"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      required
                    />
                  </div>

                  <div className="w-full xl:w-1/2">
                    <label className="mb-2.5 block text-black dark:text-white">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter scenario description"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    rows={4}
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="flex w-1/3 justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                  >
                    Edit Scenario
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditScenario;
