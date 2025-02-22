import { useEffect, useState } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import Loader from "./common/Loader";
import PageTitle from "./components/PageTitle";
import SignIn from "./pages/Authentication/SignIn";
import SignUp from "./pages/Authentication/SignUp";
import Calendar from "./pages/Calendar";
import Chart from "./pages/Chart";
import ECommerce from "./pages/Dashboard/ECommerce";
import FormElements from "./pages/Form/FormElements";
import FormLayout from "./pages/Form/FormLayout";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Tables from "./pages/Tables";
import Alerts from "./pages/UiElements/Alerts";
import Buttons from "./pages/UiElements/Buttons";
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
import ProtectedRoute from "./ProtectedRoute";
import SendEmail from "./components/SendEmail";
import ScenarioConversations from "./pages/Scenarios/ScenarioConversations";
import EditScenario from "./pages/Scenarios/EditScenario";

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ScenarioProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />

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
                <Route path="/" element={<h3>Dashboard</h3>} />
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
                      <PageTitle title="Conversations History | Admin Dashboard" />
                      <ScenarioConversations />
                    </>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <>
                      <PageTitle title="eCommerce Dashboard | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <ECommerce />
                    </>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <>
                      <PageTitle title="Calendar | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Calendar />
                    </>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <>
                      <PageTitle title="Profile | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Profile />
                    </>
                  }
                />
                <Route
                  path="/forms/form-elements"
                  element={
                    <>
                      <PageTitle title="Form Elements | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <FormElements />
                    </>
                  }
                />
                <Route
                  path="/forms/form-layout"
                  element={
                    <>
                      <PageTitle title="Form Layout | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <FormLayout />
                    </>
                  }
                />
                <Route
                  path="/tables"
                  element={
                    <>
                      <PageTitle title="Tables | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Tables />
                    </>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <>
                      <PageTitle title="Settings | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Settings />
                    </>
                  }
                />
                <Route
                  path="/chart"
                  element={
                    <>
                      <PageTitle title="Basic Chart | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Chart />
                    </>
                  }
                />
                <Route
                  path="/ui/alerts"
                  element={
                    <>
                      <PageTitle title="Alerts | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Alerts />
                    </>
                  }
                />
                <Route
                  path="/ui/buttons"
                  element={
                    <>
                      <PageTitle title="Buttons | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <Buttons />
                    </>
                  }
                />
                <Route
                  path="/auth/signin"
                  element={
                    <>
                      <PageTitle title="Signin | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <SignIn />
                    </>
                  }
                />
                <Route
                  path="/auth/signup"
                  element={
                    <>
                      <PageTitle title="Signup | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <SignUp />
                    </>
                  }
                />
                <Route
                  path="/send-email"
                  element={
                    <>
                      <PageTitle title="Send Email | TailAdmin - Tailwind CSS Admin Dashboard Template" />
                      <SendEmail />
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
