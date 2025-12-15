import React from "react";

type OptionButtonProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
};

const OptionButton = ({
  label,
  active = false,
  onClick,
  className = "",
  type = "button",
}: OptionButtonProps): React.JSX.Element => {
  const classes = [
    "btn",
    active ? "btn-primary" : "btn-outline-primary",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} onClick={onClick}>
      {label}
    </button>
  );
};

export default OptionButton;
