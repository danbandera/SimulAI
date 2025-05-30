import { useEffect } from "react";
import { useCompanies } from "../../context/CompanyContext";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import TableCompanies from "../../components/Tables/TableCompanies";

const Companies = () => {
  const { t } = useTranslation();
  const { companies, getCompanies } = useCompanies();

  useEffect(() => {
    getCompanies();
  }, []);

  return (
    <>
      <Breadcrumb pageName="Companies" />
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <TableCompanies companies={companies} />
        </div>
      </div>
    </>
  );
};

export default Companies;
