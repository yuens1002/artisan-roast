/** @jest-environment jsdom */

import { fireEvent, render } from "@testing-library/react";

/**
 * Validates the event-delegation pattern used in SearchDrawer.tsx for
 * closing the drawer whenever a link inside is clicked — including links
 * pointing to the CURRENT route (which the pathname effect alone misses).
 *
 * The handler under test:
 *   onClick={(e) => {
 *     const anchor = (e.target as HTMLElement).closest("a[href]");
 *     if (anchor) close();
 *   }}
 */

function DrawerBody({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      data-testid="drawer-body"
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a[href]");
        if (anchor) onClose();
      }}
    >
      {children}
    </div>
  );
}

describe("SearchDrawer event-delegated close-on-link-click", () => {
  it("calls close when any anchor inside is clicked", () => {
    const close = jest.fn();
    const { getByText } = render(
      <DrawerBody onClose={close}>
        <a href="https://example.com/test">Result link</a>
      </DrawerBody>
    );
    fireEvent.click(getByText("Result link"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("calls close even when the link routes to the CURRENT path (same-pathname bug)", () => {
    const close = jest.fn();
    // The handler doesn't inspect href value — it just closes whenever an
    // anchor inside the body is clicked. So same-pathname clicks close too.
    const { getByText } = render(
      <DrawerBody onClose={close}>
        <a href="https://example.com/test">Same-path link</a>
      </DrawerBody>
    );
    fireEvent.click(getByText("Same-path link"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("calls close when a click bubbles up from a nested element inside an anchor", () => {
    // ProductCard renders <Link><Card>...</Card></Link>; the click target is
    // the inner span/img, not the <a>. The handler uses closest() so the
    // nearest enclosing anchor is found.
    const close = jest.fn();
    const { getByTestId } = render(
      <DrawerBody onClose={close}>
        <a href="https://example.com/test">
          <span data-testid="card-inner">Card content</span>
        </a>
      </DrawerBody>
    );
    fireEvent.click(getByTestId("card-inner"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does NOT call close when a non-anchor button inside is clicked (e.g. a chip)", () => {
    const close = jest.fn();
    const { getByText } = render(
      <DrawerBody onClose={close}>
        <button type="button">Chip</button>
      </DrawerBody>
    );
    fireEvent.click(getByText("Chip"));
    expect(close).not.toHaveBeenCalled();
  });

  it("does NOT call close on background clicks (no anchor in click path)", () => {
    const close = jest.fn();
    const { getByTestId } = render(
      <DrawerBody onClose={close}>
        <p data-testid="background">Just text</p>
      </DrawerBody>
    );
    fireEvent.click(getByTestId("background"));
    expect(close).not.toHaveBeenCalled();
  });

  it("ignores anchors without an href attribute", () => {
    const close = jest.fn();
    const { getByText } = render(
      <DrawerBody onClose={close}>
        <a>No href</a>
      </DrawerBody>
    );
    fireEvent.click(getByText("No href"));
    expect(close).not.toHaveBeenCalled();
  });
});
