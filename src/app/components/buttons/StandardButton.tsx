import React from "react";

type StandardButtonProps = {
  label: string;
  variantClass: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
};

const StandardButton = ({
  label,
  variantClass,
  onClick,
  type = "button",
}: StandardButtonProps): React.JSX.Element => {
  const combinedClass = ["btn", variantClass, "fw-bold"]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={combinedClass} onClick={onClick}>
      {label}
    </button>
  );
};

export default StandardButton;
