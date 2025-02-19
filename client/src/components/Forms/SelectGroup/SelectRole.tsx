import React, { useState } from "react";

interface SelectRoleProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectRole: React.FC<SelectRoleProps> = ({ value, onChange }) => {
  const [isOptionSelected, setIsOptionSelected] = useState<boolean>(false);

  const changeTextColor = () => {
    setIsOptionSelected(true);
  };

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-black dark:text-white">Role</label>
      <select
        name="role"
        value={value}
        onChange={(e) => {
          onChange(e);
          changeTextColor();
        }}
        className={`w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
          isOptionSelected ? "text-black dark:text-white" : ""
        }`}
        required
      >
        <option value="">Select Role</option>
        <option value="admin">Admin</option>
        <option value="company">Company</option>
        <option value="user">User</option>
      </select>
    </div>
  );
};

export default SelectRole;
