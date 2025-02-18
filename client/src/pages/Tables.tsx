import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import TableUsers from "../components/Tables/TableUsers";
import TableThree from "../components/Tables/TableThree";
import TableTwo from "../components/Tables/TableTwo";

const Tables = () => {
  return (
    <>
      <Breadcrumb pageName="Tables" />

      <div className="flex flex-col gap-10">
        <TableUsers />
        <TableTwo />
        <TableThree />
      </div>
    </>
  );
};

export default Tables;
