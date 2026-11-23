import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CsvFileIcon, FileDropzone, UploadedFile } from "./FileDropzone";

const meta: Meta<typeof FileDropzone> = {
  title: "Components/FileDropzone",
  component: FileDropzone,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="w-[644px]"><Story /></div>],
  args: { onFiles: () => {} },
};
export default meta;

type Story = StoryObj<typeof FileDropzone>;

const HINT = (
  <>
    CVS, TXT, PDF, JPEG or PNG (Max Size: <span className="text-foreground">25MB</span>)
  </>
);

export const Default: Story = { args: { hint: HINT } };

/** With the sample-file row, as in the Figma frame. */
export const WithSample: Story = {
  args: {
    accept: ".csv",
    hint: (
      <>
        CSV (Max Size: <span className="text-foreground">25MB</span>)
      </>
    ),
    sample: {
      description: "Feel free to download the attached example as a starting point for your file",
      icon: <CsvFileIcon />,
    },
  },
};

/** Sample offered as a text link at the end of the sentence. */
export const WithSampleLink: Story = {
  args: {
    accept: ".csv",
    hint: WithSample.args?.hint,
    sample: {
      appearance: "link",
      description: "Please use the attached sample as a starting reference",
      label: "Download sample CSV",
    },
  },
};

export const Disabled: Story = { args: { hint: HINT, disabled: true } };

/** Picks a file and echoes its name, to try the click and the drop. */
export const Interactive: Story = {
  render: (args) => {
    const [names, setNames] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <FileDropzone {...args} multiple hint={HINT} onFiles={(files) => setNames(files.map((f) => f.name))} />
        <p className="text-paragraph-sm text-muted-foreground">
          {names.length ? names.join(", ") : "No files yet"}
        </p>
      </div>
    );
  },
};

/** The state a dropzone hands over to once a file is accepted. */
export const Uploaded: Story = {
  render: () => (
    <UploadedFile
      name="team_members_import_sample_2026-11-19-3-.csv"
      size={18_432}
      uploadedAt={new Date(2026, 10, 19, 12, 26)}
      onPreview={() => {}}
      onRemove={() => {}}
    />
  ),
};
