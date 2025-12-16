import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StandardButton from "./StandardButton";

describe("StandardButton", () => {
  it("renders the provided label and classes", () => {
    render(
      <StandardButton
        label="Click me"
        variantClass="btn-primary"
        className="fw-bold"
      />,
    );

    const button = screen.getByRole("button", { name: /Click me/i });
    expect(button).toHaveClass("btn");
    expect(button).toHaveClass("btn-primary");
    expect(button).toHaveClass("fw-bold");
  });

  it("invokes onClick when pressed", async () => {
    const onClick = vi.fn();
    render(
      <StandardButton
        label="Press"
        variantClass="btn-secondary"
        onClick={onClick}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Press/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
