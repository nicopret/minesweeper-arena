import type { Meta, StoryObj } from "@storybook/react";

import StandardButton from "./StandardButton";

const meta = {
  title: "Components/Buttons/StandardButton",
  component: StandardButton,
  tags: ["autodocs"],
  args: {
    label: "Click me",
    variantClass: "btn-primary",
    type: "button",
  },
  argTypes: {
    onClick: { action: "clicked" },
    variantClass: {
      control: "text",
      description: "Bootstrap variant class e.g. btn-primary",
    },
    label: { control: "text" },
  },
} satisfies Meta<typeof StandardButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    label: "Secondary",
    variantClass: "btn-secondary",
  },
};

export const Outline: Story = {
  args: {
    label: "Outline",
    variantClass: "btn-outline-primary",
  },
};
