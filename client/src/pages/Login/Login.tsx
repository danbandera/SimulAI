import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, errors: loginErrors, loading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await login(data.email, data.password);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center items-center p-10 m:p-20 h-screen">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark w-full m:w-1/2 lg:w-1/2 xl:w-1/3">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Login Form
            </h3>
          </div>

          {/* Display server-side errors */}
          {loginErrors && loginErrors.length > 0 && (
            <div className="p-6.5">
              {loginErrors.map((error, index) => (
                <p key={index} className="text-red-500 text-sm mb-1">
                  {error}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6.5">
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email", { required: true })}
                  placeholder="Enter your email address"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm">Email is required</p>
                )}
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Password
                </label>
                <input
                  type="password"
                  {...register("password", { required: true })}
                  placeholder="Enter password"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
                {formErrors.password && (
                  <p className="text-red-500 text-sm">Password is required</p>
                )}
              </div>
              <div className="mt-8">
                <button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className={`flex w-full justify-center rounded bg-primary py-3 px-5 font-medium text-gray hover:bg-opacity-90 ${
                    loading || isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {loading || isSubmitting ? "Loading..." : "Login"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
