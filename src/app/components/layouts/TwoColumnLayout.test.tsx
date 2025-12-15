import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import TwoColumnLayout from "./TwoColumnLayout";

describe("TwoColumnLayout", () => {
  it("renders left and right content", () => {
    render(<TwoColumnLayout left={<div>Left</div>} right={<div>Right</div>} />);

    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
  });
});
