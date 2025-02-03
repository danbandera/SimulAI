import { useNavigate } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const TableOne = ({ users }: { users: any }) => {
  console.log(users);
  const navigate = useNavigate();
  const { deleteUser } = useUsers();

  const handleEdit = (e: React.MouseEvent, userId: number) => {
    e.preventDefault(); // Prevent the Link navigation
    navigate(`/users/edit/${userId}`);
  };

  const handleDelete = async (e: React.MouseEvent, userId: number) => {
    e.preventDefault(); // Prevent the Link navigation

    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "No podrás revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3C50E0",
      cancelButtonColor: "#D34053",
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(userId);
        Swal.fire({
          title: "¡Eliminado!",
          text: "El usuario ha sido eliminado.",
          icon: "success",
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar el usuario.",
          icon: "error",
        });
      }
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white px-5">
        Usuarios
      </h4>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Nombre
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Email
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">Rol</h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Editar
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              Eliminar
            </h5>
          </div>
        </div>

        {users.map((user: any, key: any) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-5 ${
              key === users.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <p className="hidden text-black dark:text-white sm:block">
                {user.name}
              </p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">{user.email}</p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-meta-3">
                {user.role === "1"
                  ? "Admin"
                  : user.role === "2"
                  ? "Company"
                  : "User"}
              </p>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleEdit(e, user.id)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Editar
              </Link>
            </div>
            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <Link
                to="#"
                onClick={(e) => handleDelete(e, user.id)}
                className="inline-flex items-center justify-center rounded-md bg-danger py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
              >
                Eliminar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableOne;
