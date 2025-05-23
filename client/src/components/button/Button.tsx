import React from "react";
// import './Button.scss';

import { Icon } from "react-feather";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: Icon;
  iconPosition?: "start" | "end";
  iconColor?: "red" | "green" | "grey";
  iconFill?: boolean;
  buttonStyle?: "regular" | "action" | "alert" | "flush";
}

export function Button({
  label = "Okay",
  icon = void 0,
  iconPosition = "start",
  iconColor = void 0,
  iconFill = false,
  buttonStyle = "regular",
  ...rest
}: ButtonProps) {
  const StartIcon = iconPosition === "start" ? icon : null;
  const EndIcon = iconPosition === "end" ? icon : null;
  const classList = [];
  if (iconColor) {
    classList.push(`icon-${iconColor}`);
  }
  if (iconFill) {
    classList.push(`icon-fill`);
  }
  classList.push(`button-style-${buttonStyle}`);

  return (
    <button
      data-component="Button"
      className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
      {...rest}
    >
      {StartIcon && (
        <span className="icon icon-start">
          <StartIcon />
        </span>
      )}
      <span className="label">{label}</span>
      {EndIcon && (
        <span className="icon icon-end">
          <EndIcon />
        </span>
      )}
    </button>
  );
}
