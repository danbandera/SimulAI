import { useEffect, useRef, useState } from "react";
import TableUsers from "../../components/Tables/TableUsers";
import { useUsers } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import Swal from "sweetalert2";
import { generateCSVExample, downloadCSV } from "../../utils/csvUtils";

const Users = () => {
  const { t, i18n } = useTranslation();
  const { users, getUsers, importUsersFromCSV } = useUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

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

  const handleDownloadCSVExample = () => {
    const csvContent = generateCSVExample(t, i18n.language);
    const filename = `users_import_example_${i18n.language}.csv`;
    downloadCSV(csvContent, filename);
  };

  return (
    <>
      {/* <h1>{t("users.title")}</h1> */}
      <Breadcrumb pageName={t("users.title")} />
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <div className="mb-4 flex justify-end items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
              id="csv-upload"
            />

            {/* CSV Example Download Button */}
            <button
              onClick={handleDownloadCSVExample}
              className="inline-flex items-center justify-center rounded-md bg-meta-3 py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
            >
              {t("users.downloadCSVExample")}
            </button>

            {/* Import CSV Button with Tooltip */}
            <div className="relative flex items-center gap-2">
              <label
                htmlFor="csv-upload"
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
              >
                {t("users.importCSV")}
              </label>

              {/* Tooltip Icon */}
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <button
                  type="button"
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Tooltip */}
                {showTooltip && (
                  <div className="absolute top-full right-0 mb-2 w-80 p-3 bg-black text-white text-sm rounded-lg shadow-lg z-50">
                    <div className="relative">
                      {t("users.csvImportTooltip")}
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <TableUsers users={users} />
        </div>
      </div>
    </>
  );
};

export default Users;
