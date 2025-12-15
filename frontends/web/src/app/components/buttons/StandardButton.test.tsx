import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
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

  it("invokes onClick when pressed", () => {
    const onClick = vi.fn();
    render(
      <StandardButton
        label="Press"
        variantClass="btn-secondary"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Press/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
