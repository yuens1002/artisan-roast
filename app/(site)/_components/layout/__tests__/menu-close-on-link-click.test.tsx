/** @jest-environment jsdom */

import { fireEvent, render } from "@testing-library/react";

/**
 * Mirrors `app/(site)/_components/search/__tests__/drawer-close-on-link-click.test.tsx`
 * but for the mobile menu Sheet's same-pathname close pattern (SiteHeader.tsx).
 *
 * The handler under test:
 *   onClick={(e) => {
 *     if ((e.target as HTMLElement).closest("a[href]")) {
 *       setIsMobileMenuOpen(false);
 *     }
 *   }}
 *
 * Closing the menu Sheet on any anchor click — even links to the current
 * pathname — covers the case where the pathname-effect-based close doesn't
 * fire (because pathname doesn't change for same-route navigations).
 */

function MenuBody({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="menu-body"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a[href]")) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

describe("Mobile menu Sheet event-delegated close-on-link-click", () => {
  it("calls close when any anchor inside is clicked", () => {
    const close = jest.fn();
    const { getByText } = render(
      <MenuBody onClose={close}>
        <a href="https://example.com/test">Category link</a>
      </MenuBody>
    );
    fireEvent.click(getByText("Category link"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("calls close even when the link routes to the CURRENT path (same-pathname bug)", () => {
    const close = jest.fn();
    const { getByText } = render(
      <MenuBody onClose={close}>
        <a href="https://example.com/test">Same-path link</a>
      </MenuBody>
    );
    fireEvent.click(getByText("Same-path link"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("calls close when a click bubbles up from a nested element inside an anchor", () => {
    // Menu nav items render <Link><Button>...icon...text...</Button></Link>;
    // the click target may be the icon or text, not the <a>. closest() finds
    // the enclosing anchor regardless.
    const close = jest.fn();
    const { getByTestId } = render(
      <MenuBody onClose={close}>
        <a href="https://example.com/test">
          <span data-testid="link-inner">Home</span>
        </a>
      </MenuBody>
    );
    fireEvent.click(getByTestId("link-inner"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does NOT call close when a non-anchor button inside is clicked", () => {
    const close = jest.fn();
    const { getByText } = render(
      <MenuBody onClose={close}>
        <button type="button">Theme switcher</button>
      </MenuBody>
    );
    fireEvent.click(getByText("Theme switcher"));
    expect(close).not.toHaveBeenCalled();
  });

  it("does NOT call close on background clicks (no anchor in click path)", () => {
    const close = jest.fn();
    const { getByTestId } = render(
      <MenuBody onClose={close}>
        <p data-testid="background">Just text</p>
      </MenuBody>
    );
    fireEvent.click(getByTestId("background"));
    expect(close).not.toHaveBeenCalled();
  });

  it("ignores anchors without an href attribute", () => {
    const close = jest.fn();
    const { getByText } = render(
      <MenuBody onClose={close}>
        <a>No href</a>
      </MenuBody>
    );
    fireEvent.click(getByText("No href"));
    expect(close).not.toHaveBeenCalled();
  });
});
