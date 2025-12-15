import type { Meta, StoryObj } from "@storybook/react";
import OptionButton from "../buttons/OptionButton";
import IconTextLabel from "../labels/IconTextLabel";
import TwoColumnLayout from "./TwoColumnLayout";

const meta = {
  title: "Components/Layouts/TwoColumnLayout",
  component: TwoColumnLayout,
  tags: ["autodocs"],
  args: {
    left: (
      <>
        <OptionButton label="Easy" active />
        <OptionButton label="Medium" />
      </>
    ),
    right: <IconTextLabel iconClassName="fas fa-clock" text="Time: 00:15" />,
  },
} satisfies Meta<typeof TwoColumnLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCustomContent: Story = {
  args: {
    left: (
      <>
        <IconTextLabel iconClassName="fas fa-bomb" text="Mines: 10" />
        <IconTextLabel iconClassName="fas fa-flag" text="Flags: 3" />
      </>
    ),
    right: (
      <>
        <OptionButton label="Reset" />
        <OptionButton label="Hint" />
      </>
    ),
  },
};
