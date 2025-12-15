import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import GameStatusLabel from "./GameStatusLabel";

describe("GameStatusLabel", () => {
  it("renders icon and text with defaults", () => {
    render(
      <GameStatusLabel
        iconClassName="fa-solid fa-trophy"
        text="Victory!"
        containerTestId="status"
        iconTestId="status-icon"
      />,
    );

    const container = screen.getByTestId("status");
    const icon = screen.getByTestId("status-icon");

    expect(container).toHaveTextContent(/Victory!/);
    expect(icon).toHaveClass("fa-solid");
    expect(icon).toHaveClass("fa-trophy");
    expect(container).toHaveClass("h3");
  });
});
