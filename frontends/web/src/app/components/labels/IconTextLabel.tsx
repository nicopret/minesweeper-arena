import React from "react";

type IconTextLabelProps = {
  iconClassName: string;
  text: React.ReactNode;
  className?: string;
  containerTestId?: string;
  iconTestId?: string;
};

const IconTextLabel = ({
  iconClassName,
  text,
  className,
  containerTestId,
  iconTestId,
}: IconTextLabelProps): React.JSX.Element => {
  const classes = ["bg-light px-3 py-2 rounded fw-bold", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid={containerTestId}>
      <i
        className={`${iconClassName} me-2`}
        aria-hidden="true"
        data-testid={iconTestId}
      />
      {text}
    </div>
  );
};

export default IconTextLabel;
