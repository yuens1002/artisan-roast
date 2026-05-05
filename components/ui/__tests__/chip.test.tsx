/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { Chip, ChipPreview } from "../chip";

describe("Chip", () => {
  it("renders as a button by default", () => {
    render(<Chip>Filter</Chip>);
    const el = screen.getByRole("button", { name: "Filter" });
    expect(el.tagName).toBe("BUTTON");
    expect(el).toHaveAttribute("type", "button");
  });

  it("variant=active applies primary classes and aria-pressed=true", () => {
    render(<Chip variant="active">Single Origin</Chip>);
    const el = screen.getByRole("button", { name: "Single Origin" });
    expect(el).toHaveClass("bg-primary");
    expect(el).toHaveClass("text-primary-foreground");
    expect(el).toHaveAttribute("aria-pressed", "true");
  });

  it("variant=inactive applies secondary classes with opacity-60 + aria-pressed=false", () => {
    render(<Chip variant="inactive">Drinkware</Chip>);
    const el = screen.getByRole("button", { name: "Drinkware" });
    expect(el).toHaveClass("bg-secondary");
    expect(el).toHaveClass("text-secondary-foreground");
    expect(el).toHaveClass("opacity-60");
    expect(el).toHaveAttribute("aria-pressed", "false");
  });

  it("size=nav uses text-sm + rounded-md", () => {
    render(
      <Chip variant="inactive" size="nav">
        Nav chip
      </Chip>
    );
    const el = screen.getByRole("button", { name: "Nav chip" });
    expect(el).toHaveClass("text-sm");
    expect(el).toHaveClass("rounded-md");
  });

  it("size=filter uses text-xs + rounded-full", () => {
    render(
      <Chip variant="inactive" size="filter">
        Filter pill
      </Chip>
    );
    const el = screen.getByRole("button", { name: "Filter pill" });
    expect(el).toHaveClass("text-xs");
    expect(el).toHaveClass("rounded-full");
  });

  it("forwards onClick", () => {
    const onClick = jest.fn();
    render(
      <Chip variant="inactive" onClick={onClick}>
        Tap me
      </Chip>
    );
    fireEvent.click(screen.getByRole("button", { name: "Tap me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("explicit aria-pressed prop overrides the variant-derived value", () => {
    render(
      <Chip variant="active" aria-pressed={false}>
        Override
      </Chip>
    );
    expect(
      screen.getByRole("button", { name: "Override" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("merges custom className with variant classes", () => {
    render(
      <Chip variant="inactive" className="custom-extra">
        Merged
      </Chip>
    );
    const el = screen.getByRole("button", { name: "Merged" });
    expect(el).toHaveClass("custom-extra");
    expect(el).toHaveClass("bg-secondary");
  });
});

describe("ChipPreview", () => {
  it("renders as a non-interactive span (no role=button)", () => {
    render(<ChipPreview>Preview chip</ChipPreview>);
    expect(screen.queryByRole("button")).toBeNull();
    const el = screen.getByText("Preview chip");
    expect(el.tagName).toBe("SPAN");
  });

  it("applies preview variant styling (bg-secondary opacity-60, no hover)", () => {
    render(<ChipPreview>Preview chip</ChipPreview>);
    const el = screen.getByText("Preview chip");
    expect(el).toHaveClass("bg-secondary");
    expect(el).toHaveClass("opacity-60");
    // preview variant does not include hover:opacity-80
    expect(el.className).not.toMatch(/hover:opacity-80/);
  });

  it("size=nav applies the same nav-scale classes as Chip", () => {
    render(<ChipPreview size="nav">Nav preview</ChipPreview>);
    const el = screen.getByText("Nav preview");
    expect(el).toHaveClass("text-sm");
    expect(el).toHaveClass("rounded-md");
  });
});
