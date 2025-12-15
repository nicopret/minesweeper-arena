import React from "react";

type TwoColumnLayoutProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
};

const TwoColumnLayout = ({
  left,
  right,
  className = "",
}: TwoColumnLayoutProps): React.JSX.Element => {
  return (
    <div
      className={`d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 ${className}`.trim()}
    >
      <div className="d-flex gap-3">{left}</div>
      <div className="d-flex align-items-center">{right}</div>
    </div>
  );
};

export default TwoColumnLayout;
