import { useEffect, useRef } from "react";
import TableUsers from "../../components/Tables/TableUsers";
import { useUsers } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Swal from "sweetalert2";

const Users = () => {
  const { t } = useTranslation();
  const { users, getUsers, importUsersFromCSV } = useUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUsers();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importUsersFromCSV(file);

      // Show success message with number of imported users
      if (result.results.success.length > 0) {
        await Swal.fire({
          title: t("alerts.importSuccessTitle"),
          text: `${result.results.success.length} ${t("alerts.importSuccessMessage")}`,
          icon: "success",
          confirmButtonColor: "#3C50E0",
        });
      }

      // Show skipped message if there were any skipped users
      if (result.results.skipped.length > 0) {
        await Swal.fire({
          title: t("alerts.importSkippedTitle"),
          text: `${result.results.skipped.length} ${t("alerts.importSkippedMessage")}`,
          icon: "info",
          confirmButtonColor: "#3C50E0",
        });
        console.info("Skipped users:", result.results.skipped);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      await Swal.fire({
        title: t("alerts.importErrorTitle"),
        text: error.message || t("alerts.importErrorMessage"),
        icon: "error",
        confirmButtonColor: "#D34053",
      });
    }
  };

  return (
    <>
      {/* <h1>{t("users.title")}</h1> */}
      <Breadcrumb pageName={t("users.title")} />
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <div className="mb-4 flex justify-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              {t("users.importCSV")}
            </label>
          </div>
          <TableUsers users={users} />
        </div>
      </div>
    </>
  );
};

export default Users;
