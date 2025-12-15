import type { Meta, StoryObj } from "@storybook/react";

import OptionButton from "./OptionButton";

const meta = {
  title: "Components/Buttons/OptionButton",
  component: OptionButton,
  tags: ["autodocs"],
  args: {
    label: "Option",
    active: false,
  },
  argTypes: {
    onClick: { action: "clicked" },
    className: { control: "text" },
    active: { control: "boolean" },
  },
} satisfies Meta<typeof OptionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    label: "Active option",
    active: true,
  },
};

export const WithCustomClass: Story = {
  args: {
    label: "Custom",
    className: "px-4",
  },
};
