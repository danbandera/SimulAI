import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Select, { SingleValue } from "react-select";

interface UserOption {
  value: number;
  label: string;
}

const NewScenario = () => {
  const navigate = useNavigate();
  const { createScenario } = useScenarios();
  const { users, getUsers } = useUsers();
  const [formData, setFormData] = useState({
    title: "",
    context: "",
    status: "draft",
    user: null as number | null,
  });

  // Transform users data for react-select
  const userOptions: UserOption[] = users.map((user) => ({
    value: user.id!,
    label: `${user.name} (${user.email})`,
  }));

  useEffect(() => {
    getUsers();
  }, []);

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
      await createScenario({
        ...formData,
        users: [formData.user],
      });
      toast.success("Scenario created successfully");
      navigate("/scenarios");
    } catch (error) {
      console.error("Error creating scenario:", error);
      toast.error("Error creating scenario");
    }
  };

  return (
    <>
      <Breadcrumb pageName="New Scenario" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Create New Scenario
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
                    Context
                  </label>
                  <textarea
                    name="context"
                    value={formData.context}
                    onChange={handleChange}
                    placeholder="Enter scenario context"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    rows={4}
                  />
                </div>

                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Assign User <span className="text-meta-1">*</span>
                  </label>
                  <Select
                    options={userOptions}
                    onChange={handleUserSelect}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Select a user..."
                    // theme={(theme) => ({
                    //   ...theme,
                    //   colors: {
                    //     ...theme.colors,
                    //     primary: "#3C50E0",
                    //     primary75: "#4C60E6",
                    //     primary50: "#5A6EE8",
                    //     primary25: "#E9ECEF",
                    //   },
                    // })}
                    // styles={{
                    //   control: (base) => ({
                    //     ...base,
                    //     backgroundColor: "transparent",
                    //     borderColor: "#E2E8F0",
                    //     "&:hover": {
                    //       borderColor: "#3C50E0",
                    //     },
                    //   }),
                    //   option: (base, state) => ({
                    //     ...base,
                    //     backgroundColor: state.isSelected
                    //       ? "#3C50E0"
                    //       : state.isFocused
                    //       ? "#E9ECEF"
                    //       : "transparent",
                    //     color: state.isSelected ? "white" : "inherit",
                    //   }),
                    // }}
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                >
                  Create Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewScenario;
