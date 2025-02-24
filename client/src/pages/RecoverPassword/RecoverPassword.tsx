import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { resetPasswordRequest } from "../../api/auth.api";

interface RecoverPasswordFormData {
  email: string;
}

const RecoverPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<RecoverPasswordFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit: SubmitHandler<RecoverPasswordFormData> = async (data) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await resetPasswordRequest(data.email);
      toast.success(
        "If an account exists with this email, you will receive reset instructions",
      );
      navigate("/login");
    } catch (error) {
      toast.error("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center p-10 m:p-20 h-screen">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark w-full m:w-1/2 lg:w-1/2 xl:w-1/3">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Recover Password
          </h3>
        </div>

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

            <div className="mt-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Sending..." : "Send Recovery Email"}
              </button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-sm text-black dark:text-white">
                Remember your password?{" "}
                <a href="/login" className="text-primary hover:underline">
                  Login here
                </a>
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecoverPassword;
