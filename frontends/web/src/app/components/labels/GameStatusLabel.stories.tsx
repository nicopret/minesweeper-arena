import type { Meta, StoryObj } from "@storybook/react";

import GameStatusLabel from "./GameStatusLabel";

const meta = {
  title: "Components/Labels/GameStatusLabel",
  component: GameStatusLabel,
  tags: ["autodocs"],
  args: {
    iconClassName: "fas fa-bomb",
    text: "Game in progress",
  },
  argTypes: {
    iconClassName: { control: "text" },
    text: { control: "text" },
    className: { control: "text" },
  },
} satisfies Meta<typeof GameStatusLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};

export const GameWon: Story = {
  args: {
    iconClassName: "fas fa-flag-checkered text-success",
    text: "You won!",
  },
};

export const GameLost: Story = {
  args: {
    iconClassName: "fas fa-skull-crossbones text-danger",
    text: "Boom! Try again.",
  },
};
