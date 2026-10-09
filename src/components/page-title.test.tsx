import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { PageTitle, PageTitleProvider, usePageTitle } from "./page-title";

// Reset to jsdom's empty default so the unmount assert proves PageTitle restores "Grimify" itself.
afterEach(() => {
  document.title = "";
});

type RegisteredTitle = ReturnType<typeof usePageTitle>;

function TitleProbe({ onTitle }: { onTitle: (title: RegisteredTitle) => void }) {
  const title = usePageTitle();
  useEffect(() => onTitle(title), [title, onTitle]);
  return null;
}

describe("PageTitle", () => {
  it("names the page in the tab", () => {
    const { rerender, unmount } = render(<PageTitle>Mephiston Red</PageTitle>);

    expect(screen.getByRole("heading", { level: 1, name: "Mephiston Red" })).toBeInTheDocument();
    expect(document.title).toBe("Mephiston Red · Grimify");

    rerender(<PageTitle>Abaddon Black</PageTitle>);
    expect(document.title).toBe("Abaddon Black · Grimify");

    unmount();
    expect(document.title).toBe("Grimify");
  });

  it("uses documentTitle for the tab but keeps children in the h1", () => {
    render(<PageTitle documentTitle="Paint not found">Not found</PageTitle>);

    expect(screen.getByRole("heading", { level: 1, name: "Not found" })).toBeInTheDocument();
    expect(document.title).toBe("Paint not found · Grimify");
  });

  it("registers its text and h1 with the provider until unmount", () => {
    let seen: RegisteredTitle | undefined;
    const record = (title: RegisteredTitle) => {
      seen = title;
    };
    function Page({ showTitle }: { showTitle: boolean }) {
      return (
        <PageTitleProvider>
          <TitleProbe onTitle={record} />
          {showTitle && <PageTitle>Settings</PageTitle>}
        </PageTitleProvider>
      );
    }

    const { rerender } = render(<Page showTitle />);

    const heading = screen.getByRole("heading", { level: 1, name: "Settings" });
    expect(heading).toHaveClass("page-title");
    expect(seen?.text).toBe("Settings");
    expect(seen?.element).toBe(heading);

    rerender(<Page showTitle={false} />);
    expect(seen).toBeNull();
  });
});
