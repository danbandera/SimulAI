import { useEffect } from "react";
import TableOne from "../../components/Tables/TableOne";
import { useUsers } from "../../context/UserContext";

const Users = () => {
  const { users, getUsers } = useUsers();
  useEffect(() => {
    getUsers();
  }, []);
  console.log(users);
  return (
    <>
      <h1>Users</h1>
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-12">
          <TableOne users={users} />
        </div>
      </div>
    </>
  );
};

export default Users;
