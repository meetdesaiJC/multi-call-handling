import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Toggle } from "@/components/Toggle";
import {
  DataTable,
  Table,
  TableBody,
  TableBulkBar,
  TableCell,
  TableCellText,
  TableEmpty,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSortLabel,
} from "./Table";

/* ------------------------------------------------------------------ */
/* Demo helpers                                                        */
/* ------------------------------------------------------------------ */

// Literal flag red, not a design token — story fixture content, the same way a
// brand logo keeps its own colour. The no-raw-hex rule covers UI, not content.
function FlagLead() {
  return (
    <div
      className="flex size-8 items-center justify-center rounded-full bg-[#B22234] text-[10px] font-semibold text-white"
      aria-hidden="true"
    >
      US
    </div>
  );
}

function StarRating({ value = 3.5 }: { value?: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value > i && value < i + 1;
        return (
          <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2.5l2.2 4.46 4.92.72-3.56 3.47.84 4.9L10 13.77 5.6 16.05l.84-4.9L2.88 7.68l4.92-.72L10 2.5z"
              // Fixture colours: a rating gold with no token, and the line grey.
              fill={filled || half ? "#FDB022" : "var(--color-line)"}
            />
          </svg>
        );
      })}
    </div>
  );
}

function Tag({
  children,
  tone = "purple",
}: {
  children: React.ReactNode;
  tone?: "purple" | "blue" | "orange" | "grey";
}) {
  const tones = {
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-indigo-50 text-indigo-700",
    orange: "bg-avatar-orange-bg text-avatar-orange-fg",
    grey: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2 text-label-sm ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function ActionButtons() {
  const Icon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h4M12 10h4M10 4v4M10 12v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="3.5" y="3.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
  return (
    <div className="inline-flex">
      {[0, 1, 2].map((i) => (
        <button
          key={i}
          type="button"
          className="-ml-px inline-flex size-10 items-center justify-center border border-line bg-white text-foreground first:ml-0 first:rounded-l-[4px] last:rounded-r-[4px] hover:bg-secondary-bg"
          aria-label={`Row action ${i + 1}`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}

const ROWS = [
  { id: "1", name: "Olivia Rhye", email: "olivia@untitledui.com", text: "Sales Inquiry", rating: 3.5 },
  { id: "2", name: "Phoenix Baker", email: "phoenix@untitledui.com", text: "Support Ticket", rating: 4 },
  { id: "3", name: "Lana Steiner", email: "lana@untitledui.com", text: "Partnership", rating: 5 },
  { id: "4", name: "Demi Wilkinson", email: "demi@untitledui.com", text: "Billing", rating: 2.5 },
] as const;

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

const meta = {
  title: "Components/Table",
  component: DataTable,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Stories                                                             */
/* ------------------------------------------------------------------ */

/** Figma `Type=Default table` — checkbox column, lead country, text, ratings, tags, actions. */
export const Default: Story = {
  render: function DefaultTable() {
    const [selected, setSelected] = React.useState<string[]>(["1", "2"]);
    const [page, setPage] = React.useState(3);
    const [pageSize, setPageSize] = React.useState(10);
    const [sort, setSort] = React.useState<"asc" | "desc" | false>("asc");

    const allSelected = selected.length === ROWS.length;
    const someSelected = selected.length > 0 && !allSelected;

    const toggleAll = () => {
      setSelected(allSelected ? [] : ROWS.map((r) => r.id));
    };
    const toggleRow = (id: string) => {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <div className="relative w-full max-w-[1136px] overflow-hidden rounded-[4px] border border-line bg-white">
        <Table horizontalScroll>
          <TableHeader>
            <TableRow state="default" className="hover:bg-transparent">
              <TableHead>
                <Checkbox
                  size="md"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead>
                <TableSortLabel
                  direction={sort}
                  onClick={() =>
                    setSort((d) => (d === "asc" ? "desc" : d === "desc" ? false : "asc"))
                  }
                >
                  Lead Country
                </TableSortLabel>
              </TableHead>
              <TableHead>Text</TableHead>
              <TableHead>Ratings</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => {
              const isSelected = selected.includes(row.id);
              return (
                <TableRow key={row.id} state={isSelected ? "selected" : "default"}>
                  <TableCell>
                    <Checkbox
                      size="md"
                      checked={isSelected}
                      onCheckedChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <TableCellText
                      lead={<FlagLead />}
                      primary={row.name}
                      supporting={row.email}
                    />
                  </TableCell>
                  <TableCell>{row.text}</TableCell>
                  <TableCell>
                    <StarRating value={row.rating} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Tag tone="purple">Tags</Tag>
                      <Tag tone="blue">Tags</Tag>
                      <Tag tone="orange">Tags</Tag>
                      <Tag tone="grey">+4</Tag>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButtons />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <TableBulkBar
          count={selected.length}
          actions={
            <>
              <Button variant="grey-outline" size="sm" className="bg-white">
                Secondary
              </Button>
              <Button variant="primary" size="sm">
                Primary
              </Button>
            </>
          }
        />

        <div className="border-t border-line">
          <TablePagination
            page={page}
            pageCount={6}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            rangeLabel="1-25 of 103 items"
          />
        </div>
      </div>
    );
  },
};

/** Figma `Type=Empty state`. */
export const EmptyState: Story = {
  render: () => (
    <div className="w-full max-w-[1136px] overflow-hidden rounded-[4px] border border-line bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Checkbox size="md" aria-label="Select all" />
            </TableHead>
            <TableHead>Lead icon</TableHead>
            <TableHead>Text</TableHead>
            <TableHead>Toggle</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Ratings</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <TableEmpty
        actions={
          <>
            <Button variant="primary-outline" size="sm">
              Secondary
            </Button>
            <Button variant="primary" size="sm">
              Primary
            </Button>
          </>
        }
      />
      <div className="border-t border-line">
        <TablePagination
          page={3}
          pageCount={6}
          pageSize={10}
          rangeLabel="1-25 of 103 items"
        />
      </div>
    </div>
  ),
};

/** Row visual states from Body cell `State`. */
export const RowStates: Story = {
  render: () => (
    <div className="w-full max-w-[640px] overflow-hidden rounded-[4px] border border-line">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>State</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow state="default">
            <TableCell>Default</TableCell>
            <TableCell>Olivia Rhye</TableCell>
            <TableCell className="text-muted-foreground">olivia@untitledui.com</TableCell>
          </TableRow>
          <TableRow state="hover">
            <TableCell>Hover</TableCell>
            <TableCell>Phoenix Baker</TableCell>
            <TableCell className="text-muted-foreground">phoenix@untitledui.com</TableCell>
          </TableRow>
          <TableRow state="selected">
            <TableCell>Selected</TableCell>
            <TableCell>Lana Steiner</TableCell>
            <TableCell className="text-muted-foreground">lana@untitledui.com</TableCell>
          </TableRow>
          <TableRow state="disabled">
            <TableCell>Disabled</TableCell>
            <TableCell>Demi Wilkinson</TableCell>
            <TableCell className="text-muted-foreground">demi@untitledui.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

/** Common cell content patterns from `.Table column` / `Body cell` Style. */
export const CellTypes: Story = {
  render: () => (
    <div className="w-full max-w-[900px] overflow-hidden rounded-[4px] border border-line">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Lead text</TableHead>
            <TableHead>Lead avatar</TableHead>
            <TableHead>Toggle</TableHead>
            <TableHead>Badge / Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <TableCellText primary="+9181942345" supporting="olivia@untitledui.com" />
            </TableCell>
            <TableCell>
              <TableCellText
                lead={
                  <img
                    src="https://i.pravatar.cc/64?u=olivia"
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                }
                primary="Olivia Rhye"
                supporting="olivia@untitledui.com"
              />
            </TableCell>
            <TableCell>
              <Toggle aria-label="Row toggle" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Tag tone="blue">Badge</Tag>
                <Tag tone="purple">Tags</Tag>
                <Tag tone="grey">+2</Tag>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

/** Pagination control alone. */
export const PaginationOnly: Story = {
  render: function PaginationStory() {
    const [page, setPage] = React.useState(3);
    const [pageSize, setPageSize] = React.useState(10);
    return (
      <div className="w-full max-w-[1136px] border border-line">
        <TablePagination
          page={page}
          pageCount={6}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          rangeLabel="1-25 of 103 items"
        />
      </div>
    );
  },
};
