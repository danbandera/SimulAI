import { useEffect } from "react";
import { useScenarios } from "../../context/ScenarioContext";
import TableScenarios from "../../components/Tables/TableScenarios";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
const Scenarios = () => {
  const { t } = useTranslation();
  const { scenarios, loadScenarios } = useScenarios();
  useEffect(() => {
    loadScenarios();
  }, []);
  return (
    <>
      <Breadcrumb pageName={t("scenarios.title")} />
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <TableScenarios scenarios={scenarios} />
        </div>
      </div>
    </>
  );
};

export default Scenarios;
