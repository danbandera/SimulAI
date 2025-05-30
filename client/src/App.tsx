import { Outlet, Route, Routes } from "react-router-dom";
import PageTitle from "./components/PageTitle";
import ECommerce from "./pages/Dashboard/ECommerce";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DefaultLayout from "./layout/DefaultLayout";
import Users from "./pages/Users/Users";
import NewUser from "./pages/Users/NewUser";
import EditUser from "./pages/Users/EditUser";
import { UserProvider, useUsers } from "./context/UserContext";
import Companies from "./pages/Companies/Companies";
import NewCompany from "./pages/Companies/NewCompany";
import EditCompany from "./pages/Companies/EditCompany";
import { CompanyProvider } from "./context/CompanyContext";
import Scenarios from "./pages/Scenarios/Scenarios";
import { ScenarioProvider } from "./context/ScenarioContext";
import NewScenario from "./pages/Scenarios/NewScenario";
import ScenarioDetail from "./pages/Scenarios/ScenarioDetail";
import Login from "./pages/Login/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SendEmail from "./components/SendEmail";
import ScenarioConversations from "./pages/Scenarios/ScenarioConversations";
import EditScenario from "./pages/Scenarios/EditScenario";
import RecoverPassword from "./pages/RecoverPassword/RecoverPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import AISettings from "./pages/AISettings";
import SystemSettings from "./pages/SystemSettings";
import ScenarioReport from "./pages/Scenarios/ScenarioReport";

// Admin-only route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useUsers();
  const { user, loading } = useAuth();

  // Show loading while authentication or user data is being loaded
  if (loading || (user && !currentUser)) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check admin privileges after loading is complete
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="text-lg text-red-500">
          Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <CompanyProvider>
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
                    path="/companies"
                    element={
                      <>
                        <PageTitle title="Companies | Admin Dashboard" />
                        <AdminRoute>
                          <Companies />
                        </AdminRoute>
                      </>
                    }
                  />
                  <Route
                    path="/companies/new"
                    element={
                      <>
                        <PageTitle title="New Company | Admin Dashboard" />
                        <AdminRoute>
                          <NewCompany />
                        </AdminRoute>
                      </>
                    }
                  />
                  <Route
                    path="/companies/edit/:id"
                    element={
                      <>
                        <PageTitle title="Edit Company | Admin Dashboard" />
                        <AdminRoute>
                          <EditCompany />
                        </AdminRoute>
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
                    path="/ai-settings"
                    element={
                      <>
                        <PageTitle title="AI Settings | Admin Dashboard" />
                        <AdminRoute>
                          <AISettings />
                        </AdminRoute>
                      </>
                    }
                  />
                  <Route
                    path="/system-settings"
                    element={
                      <>
                        <PageTitle title="System Settings | Admin Dashboard" />
                        <AdminRoute>
                          <SystemSettings />
                        </AdminRoute>
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
        </CompanyProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
