import React, { useEffect } from "react";
import CardDataStats from "../../components/CardDataStats";
import ChartOne from "../../components/Charts/ChartOne";
import ChartThree from "../../components/Charts/ChartThree";
import ChartTwo from "../../components/Charts/ChartTwo";
import ChatCard from "../../components/Chat/ChatCard";
import MapOne from "../../components/Maps/MapOne";
import { useUsers } from "../../context/UserContext";
import { useScenarios } from "../../context/ScenarioContext";
import { Link } from "react-router-dom";
// import TableUsers from "../../components/Tables/TableUsers";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
  status: string;
  assigned_user: User;
  created_by: User;
  created_at: string;
  updated_at?: string;
  aspects?: { value: string; label: string }[];
  files?: string[];
}

const ECommerce: React.FC = () => {
  const { currentUser } = useUsers();
  // get scenarios by user id
  const { scenarios, loadScenarios } = useScenarios();
  useEffect(() => {
    loadScenarios();
  }, []);

  const scenariosByUser = scenarios.filter(
    (scenario) => scenario.assigned_user.id === currentUser?.id,
  );

  const filteredScenarios = scenarios
    .filter((scenario) => {
      if (currentUser?.role === "admin") {
        return true; // Admin sees all scenarios
      }
      if (currentUser?.role === "company") {
        return scenario.created_by.id === Number(currentUser?.id); // Company sees only their created scenarios
      }
      // Regular user only sees scenarios assigned to them
      return scenario.assigned_user?.id === Number(currentUser?.id);
    })
    .sort((a, b) => {
      // Sort by created_at in descending order (newest first)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  console.log(filteredScenarios);
  return (
    <>
      {/* if currentUser is admin, show all scenarios, if currentUser is company, show scenarios by user id  and if currentUser is user, show scenarios by user id */}
      {/* {currentUser?.role === "admin" && ( */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 xl:gap-7.5">
        {filteredScenarios.map((scenario) => (
          <div key={scenario.id} className="col-span-3 grid grid-cols-3 gap-4">
            <Link to={`/scenarios/${scenario.id}`} className="col-span-1">
              <CardDataStats
                title={scenario.title}
                total="calificación"
                rate="43%"
              >
                <svg
                  className="fill-primary dark:fill-white"
                  width="22"
                  height="16"
                  viewBox="0 0 22 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 15.1156C4.19376 15.1156 0.825012 8.61876 0.687512 8.34376C0.584387 8.13751 0.584387 7.86251 0.687512 7.65626C0.825012 7.38126 4.19376 0.918762 11 0.918762C17.8063 0.918762 21.175 7.38126 21.3125 7.65626C21.4156 7.86251 21.4156 8.13751 21.3125 8.34376C21.175 8.61876 17.8063 15.1156 11 15.1156ZM2.26876 8.00001C3.02501 9.27189 5.98126 13.5688 11 13.5688C16.0188 13.5688 18.975 9.27189 19.7313 8.00001C18.975 6.72814 16.0188 2.43126 11 2.43126C5.98126 2.43126 3.02501 6.72814 2.26876 8.00001Z"
                    fill=""
                  />
                  <path
                    d="M11 10.9219C9.38438 10.9219 8.07812 9.61562 8.07812 8C8.07812 6.38438 9.38438 5.07812 11 5.07812C12.6156 5.07812 13.9219 6.38438 13.9219 8C13.9219 9.61562 12.6156 10.9219 11 10.9219ZM11 6.625C10.2437 6.625 9.625 7.24375 9.625 8C9.625 8.75625 10.2437 9.375 11 9.375C11.7563 9.375 12.375 8.75625 12.375 8C12.375 7.24375 11.7563 6.625 11 6.625Z"
                    fill=""
                  />
                </svg>
              </CardDataStats>
            </Link>
            <div className="col-span-2">
              <ChartOne scenario={scenario} />
            </div>
          </div>
        ))}
      </div>
      {/* )} */}
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        {/* <ChartOne /> */}
        {/* <ChartTwo /> */}
        {/* <ChartThree /> */}
        {/* <MapOne /> */}
        {/* <div className="col-span-12 xl:col-span-8">
          <TableUsers />
        </div> */}
        {/* <ChatCard /> */}
      </div>
    </>
  );
};

export default ECommerce;
