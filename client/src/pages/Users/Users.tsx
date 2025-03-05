import { useEffect } from "react";
import TableUsers from "../../components/Tables/TableUsers";
import { useUsers } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
const Users = () => {
  const { t } = useTranslation();
  const { users, getUsers } = useUsers();
  useEffect(() => {
    getUsers();
  }, []);
  return (
    <>
      {/* <h1>{t("users.title")}</h1> */}
      <Breadcrumb pageName={t("users.title")} />
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <TableUsers users={users} />
        </div>
      </div>
    </>
  );
};

export default Users;
