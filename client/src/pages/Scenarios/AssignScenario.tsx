import { useState } from "react";
import { useScenarios } from "../../context/ScenarioContext";
import { sendScenarioCredentials } from "../../api/email.api";
import { generateRandomPassword } from "../../utils/passwordUtils";
import { toast } from "react-hot-toast";

const AssignScenario = ({ scenarioId, userName, userEmail }) => {
  const { assignScenarioToUser } = useScenarios();
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      // Generate a random password
      const password = generateRandomPassword();

      // First, assign the scenario
      await assignScenarioToUser(scenarioId, {
        userId: userId,
        password: password,
        // other assignment data...
      });

      // Then send the credentials via email
      await sendScenarioCredentials({
        to: userEmail,
        userName: userName,
        scenarioName: scenarioName,
        password: password,
      });

      toast.success("Scenario assigned and credentials sent successfully!");
    } catch (error) {
      console.error("Error assigning scenario:", error);
      toast.error("Failed to assign scenario or send credentials");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <button
      onClick={handleAssign}
      disabled={isAssigning}
      className="flex justify-center rounded bg-primary p-3 font-medium text-gray"
    >
      {isAssigning ? "Assigning..." : "Assign Scenario"}
    </button>
  );
};

export default AssignScenario;
