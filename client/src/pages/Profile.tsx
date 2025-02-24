import { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { useUsers } from "../context/UserContext";
import { toast } from "react-hot-toast";
import userDefaultImage from "../images/user/default-user.jpg";
import Swal from "sweetalert2";

interface UpdateUserData {
  name: string;
  email: string;
  role: string;
  password?: string;
  profile_image?: string;
  created_by?: number;
}

interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_image: string;
}

const Profile = () => {
  const { currentUser, updateUser, updateUserProfileImage } = useUsers();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(userDefaultImage);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profile_image: "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profile_image: currentUser.profile_image || "",
      });
      // If user has a profile image, set it
      if (currentUser.profile_image) {
        setProfileImage(currentUser.profile_image);
      }
    }
  }, [currentUser]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser?.id) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const response = await updateUserProfileImage(currentUser.id, file);

        if (response && response.profile_image) {
          setProfileImage(response.profile_image);
          toast.success("Profile image updated successfully!");
        } else {
          throw new Error("No profile image URL received");
        }
      } catch (error: any) {
        console.error("Error uploading profile image:", error);
        toast.error(
          error.response?.data?.message || "Error uploading profile image",
        );
        // Reset preview on error
        setProfileImage(currentUser.profile_image || userDefaultImage);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords don't match!");
      // sweetalert
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "New passwords don't match!",
      });
      return;
    }

    try {
      if (currentUser?.id) {
        const updateData: UpdateUserData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.newPassword || undefined,
          profile_image:
            profileImage !== userDefaultImage ? profileImage : undefined,
        };
        await updateUser(currentUser.id, updateData);
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    }
  };

  return (
    <>
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="pt-4 px-4 text-center">
          <div className="relative mx-auto h-40 w-40">
            <div className="relative overflow-hidden rounded-full w-full h-full">
              <img
                src={profileImage}
                alt="profile"
                className="w-full h-full object-cover rounded-full border-4 border-gray-200 dark:border-gray-700"
              />
              {isEditing && (
                <label
                  htmlFor="profile"
                  className="cursor-pointer absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary hover:bg-opacity-90">
                    <svg
                      className="fill-current"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.76464 1.42638C4.87283 1.2641 5.05496 1.16663 5.25 1.16663H8.75C8.94504 1.16663 9.12717 1.2641 9.23536 1.42638L10.2289 2.91663H12.25C12.7141 2.91663 13.1592 3.101 13.4874 3.42919C13.8156 3.75738 14 4.2025 14 4.66663V11.0833C14 11.5474 13.8156 11.9925 13.4874 12.3207C13.1592 12.6489 12.7141 12.8333 12.25 12.8333H1.75C1.28587 12.8333 0.840752 12.6489 0.512563 12.3207C0.184375 11.9925 0 11.5474 0 11.0833V4.66663C0 4.2025 0.184374 3.75738 0.512563 3.42919C0.840752 3.101 1.28587 2.91663 1.75 2.91663H3.77114L4.76464 1.42638ZM7 4.66663C6.54746 4.66663 6.10013 4.78316 5.70012 5.00755C5.30011 5.23194 4.96095 5.55686 4.71456 5.94971C4.46817 6.34256 4.32187 6.78916 4.28882 7.24997C4.25576 7.71079 4.33725 8.17163 4.52672 8.59125C4.71619 9.01086 5.00835 9.37407 5.37429 9.64774C5.74022 9.92141 6.16873 10.0957 6.62059 10.1559C7.07245 10.2161 7.52994 10.1601 7.95555 9.99308C8.38116 9.82605 8.75838 9.55317 9.05533 9.19663C9.09149 9.15286 9.11783 9.10157 9.13254 9.04633C9.14726 8.99109 9.14995 8.93315 9.14042 8.87652C9.13089 8.81989 9.10936 8.76586 9.07725 8.71825C9.04513 8.67064 9.00316 8.63054 8.95397 8.60087C8.90478 8.5712 8.84943 8.55271 8.79155 8.54675C8.73367 8.54079 8.67478 8.54748 8.62003 8.56635C8.56529 8.58522 8.51602 8.61582 8.47548 8.65616C8.26897 8.90039 8.00766 9.08857 7.71305 9.20312C7.41844 9.31766 7.09936 9.35506 6.78714 9.31198C6.47491 9.26889 6.17806 9.14666 5.92398 8.95621C5.66991 8.76576 5.46613 8.51271 5.32901 8.2195C5.19189 7.92628 5.12577 7.60192 5.13656 7.27561C5.14736 6.94929 5.23474 6.63031 5.39089 6.34712C5.54704 6.06392 5.76724 5.82485 6.03351 5.64854C6.29977 5.47224 6.60392 5.36384 6.92051 5.33331C6.96883 5.32925 7.01588 5.31538 7.05905 5.29242C7.10221 5.26945 7.14062 5.23783 7.17244 5.19916C7.20426 5.16049 7.22889 5.11547 7.24516 5.06663C7.26144 5.01778 7.26907 4.96605 7.26765 4.91411C7.26623 4.86217 7.25578 4.81099 7.23682 4.76312C7.21786 4.71526 7.19075 4.67162 7.15686 4.63469C7.12297 4.59776 7.08291 4.56829 7.03885 4.54787C6.99479 4.52745 6.94752 4.51645 6.89964 4.51563L7 4.66663Z"
                        fill=""
                      />
                    </svg>
                  </span>
                  <input
                    type="file"
                    name="profile"
                    id="profile"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
              {currentUser?.name}
            </h3>
          </div>
        </div>

        <div className="px-6.5 pb-6.5">
          <form onSubmit={handleSubmit}>
            <div className="mb-4.5">
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center justify-center rounded-md border border-primary py-2 px-6 text-center font-medium text-primary hover:bg-opacity-90"
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                <div className="w-full xl:w-1/2">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div className="w-full xl:w-1/2">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              {isEditing && (
                <>
                  <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="w-full xl:w-1/2">
                      <label className="mb-2.5 block text-black dark:text-white">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Profile;
