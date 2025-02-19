import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScenarios } from "../../context/ScenarioContext";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";

interface User {
  id: number;
  name: string;
  email: string;
}

const EditScenario: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateScenario, getScenario } = useScenarios();
  const { users, getUsers } = useUsers();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "draft",
    user: null as number | null,
  });

  useEffect(() => {
    const loadScenario = async () => {
      try {
        const scenarioData = await getScenario(Number(id));
        setFormData({
          title: scenarioData.title,
          description: scenarioData.description,
          status: scenarioData.status,
          user: scenarioData.user,
        });
      } catch (error) {
        console.error("Error loading scenario:", error);
        toast.error("Error loading scenario");
        navigate("/scenarios");
      }
    };

    loadScenario();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await updateScenario(Number(id), formData);
      toast.success("Scenario updated successfully!");
      navigate("/scenarios");
    } catch (error) {
      console.error("Error updating scenario:", error);
      toast.error("Error updating scenario");
    }
  };

  return (
    <>
      <Breadcrumb pageName="Edit Scenario" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Edit Scenario</h1>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
          </div>
        </form>
      </div>
    </>
  );
};

export default EditScenario;
