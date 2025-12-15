import type { Meta, StoryObj } from "@storybook/react";

import IconTextLabel from "./IconTextLabel";

const meta = {
  title: "Components/Labels/IconTextLabel",
  component: IconTextLabel,
  tags: ["autodocs"],
  args: {
    iconClassName: "fas fa-flag",
    text: "Flags: 10",
  },
  argTypes: {
    iconClassName: { control: "text" },
    text: { control: "text" },
    className: { control: "text" },
  },
} satisfies Meta<typeof IconTextLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Warning: Story = {
  args: {
    iconClassName: "fas fa-exclamation-triangle text-warning",
    text: "Caution: Limited moves",
  },
};

export const Success: Story = {
  args: {
    iconClassName: "fas fa-check-circle text-success",
    text: "All clear",
  },
};
