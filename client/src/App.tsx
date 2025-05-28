import { Outlet, Route, Routes } from "react-router-dom";
import PageTitle from "./components/PageTitle";
import ECommerce from "./pages/Dashboard/ECommerce";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DefaultLayout from "./layout/DefaultLayout";
import Users from "./pages/Users/Users";
import NewUser from "./pages/Users/NewUser";
import EditUser from "./pages/Users/EditUser";
import { UserProvider } from "./context/UserContext";
import Scenarios from "./pages/Scenarios/Scenarios";
import { ScenarioProvider } from "./context/ScenarioContext";
import NewScenario from "./pages/Scenarios/NewScenario";
import ScenarioDetail from "./pages/Scenarios/ScenarioDetail";
import Login from "./pages/Login/Login";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SendEmail from "./components/SendEmail";
import ScenarioConversations from "./pages/Scenarios/ScenarioConversations";
import EditScenario from "./pages/Scenarios/EditScenario";
import RecoverPassword from "./pages/RecoverPassword/RecoverPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import SettingsAdmin from "./pages/SettingsAdmin";
import ScenarioReport from "./pages/Scenarios/ScenarioReport";

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ScenarioProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/recover-password" element={<RecoverPassword />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />

              {/* Wrap protected routes in DefaultLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <DefaultLayout>
                      <Outlet />
                    </DefaultLayout>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<ECommerce />} />
                <Route
                  path="/users"
                  element={
                    <>
                      <PageTitle title="Users | Admin Dashboard" />
                      <Users />
                    </>
                  }
                />
                <Route
                  path="/users/new"
                  element={
                    <>
                      <PageTitle title="New User | Admin Dashboard" />
                      <NewUser />
                    </>
                  }
                />
                <Route
                  path="/users/edit/:id"
                  element={
                    <>
                      <PageTitle title="Edit User | Admin Dashboard" />
                      <EditUser />
                    </>
                  }
                />
                <Route
                  path="/scenarios"
                  element={
                    <>
                      <PageTitle title="Scenarios | Admin Dashboard" />
                      <Scenarios />
                    </>
                  }
                />
                <Route
                  path="/scenarios/new"
                  element={
                    <>
                      <PageTitle title="New Scenario | Admin Dashboard" />
                      <NewScenario />
                    </>
                  }
                />
                <Route
                  path="/scenarios/:id"
                  element={
                    <>
                      <PageTitle title="Scenario Detail | Admin Dashboard" />
                      <ScenarioDetail />
                    </>
                  }
                />
                <Route
                  path="/scenarios/edit/:id"
                  element={
                    <>
                      <PageTitle title="Edit Scenario | Admin Dashboard" />
                      <EditScenario />
                    </>
                  }
                />
                <Route
                  path="/scenarios/:id/conversations"
                  element={
                    <>
                      <PageTitle title="Scenario Conversations | Admin Dashboard" />
                      <ScenarioConversations />
                    </>
                  }
                />
                <Route
                  path="/scenarios/:id/report"
                  element={
                    <>
                      <PageTitle title="Scenario Report | Admin Dashboard" />
                      <ScenarioReport />
                    </>
                  }
                />

                <Route
                  path="/settings-admin"
                  element={
                    <>
                      <PageTitle title="Settings | Admin Dashboard" />
                      <SettingsAdmin />
                    </>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <>
                      <PageTitle title="Profile | SimulAI - Tailwind CSS Admin Dashboard Template" />
                      <Profile />
                    </>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <>
                      <PageTitle title="Settings | SimulAI - Tailwind CSS Admin Dashboard Template" />
                      <Settings />
                    </>
                  }
                />
                <Route
                  path="/send-email"
                  element={
                    <>
                      <PageTitle title="Send Email | SimulAI - Tailwind CSS Admin Dashboard Template" />
                      <SendEmail />
                    </>
                  }
                />
                <Route
                  path="/recover-password"
                  element={
                    <>
                      <PageTitle title="Recover Password | SimulAI - Tailwind CSS Admin Dashboard Template" />
                      <RecoverPassword />
                    </>
                  }
                />
              </Route>
            </Routes>
          </div>
        </ScenarioProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
