import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import IconTextLabel from "./IconTextLabel";

describe("IconTextLabel", () => {
  it("renders provided icon and text", () => {
    render(
      <IconTextLabel
        iconClassName="fa-solid fa-star"
        text="Hello"
        containerTestId="label"
        iconTestId="label-icon"
        className="custom-class"
      />,
    );

    const label = screen.getByTestId("label");
    const icon = screen.getByTestId("label-icon");

    expect(label).toHaveTextContent(/Hello/);
    expect(icon).toHaveClass("fa-solid");
    expect(icon).toHaveClass("fa-star");
    expect(label).toHaveClass("custom-class");
  });

  it("updates when icon or text props change", () => {
    const { rerender: doRerender } = render(
      <IconTextLabel
        iconClassName="fa-regular fa-clock"
        text="001"
        containerTestId="dynamic-label"
        iconTestId="dynamic-icon"
      />,
    );

    expect(screen.getByTestId("dynamic-label")).toHaveTextContent(/001/);
    expect(screen.getByTestId("dynamic-icon")).toHaveClass("fa-clock");

    doRerender(
      <IconTextLabel
        iconClassName="fa-solid fa-flag"
        text="010"
        containerTestId="dynamic-label"
        iconTestId="dynamic-icon"
      />,
    );

    expect(screen.getByTestId("dynamic-label")).toHaveTextContent(/010/);
    const updatedIcon = screen.getByTestId("dynamic-icon");
    expect(updatedIcon).toHaveClass("fa-flag");
    expect(updatedIcon).toHaveClass("fa-solid");
  });
});
