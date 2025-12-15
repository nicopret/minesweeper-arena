import React from "react";

type GameStatusLabelProps = {
  iconClassName: string;
  text: React.ReactNode;
  className?: string;
  containerTestId?: string;
  iconTestId?: string;
};

const GameStatusLabel = ({
  iconClassName,
  text,
  className = "",
  containerTestId,
  iconTestId,
}: GameStatusLabelProps): React.JSX.Element => {
  const containerClass = ["text-center", "mb-3", "h3", "fw-bold", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass} data-testid={containerTestId}>
      <i
        className={`${iconClassName} me-2`}
        aria-hidden="true"
        data-testid={iconTestId}
      />
      {text}
    </div>
  );
};

export default GameStatusLabel;
