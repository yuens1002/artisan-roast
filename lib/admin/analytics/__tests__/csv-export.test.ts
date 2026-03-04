import { buildCsvString } from "../csv-export";

describe("buildCsvString", () => {
  it("joins headers and rows with commas and newlines", () => {
    const csv = buildCsvString(
      ["Name", "Qty", "Revenue"],
      [
        ["Ethiopian", "10", "$150.00"],
        ["Colombian", "5", "$75.00"],
      ]
    );
    expect(csv).toBe(
      "Name,Qty,Revenue\nEthiopian,10,$150.00\nColombian,5,$75.00"
    );
  });

  it("escapes cells with commas", () => {
    const csv = buildCsvString(["Name"], [["Los Angeles, CA"]]);
    expect(csv).toBe('Name\n"Los Angeles, CA"');
  });

  it("escapes cells with double quotes", () => {
    const csv = buildCsvString(["Name"], [['12" Mug']]);
    expect(csv).toBe('Name\n"12"" Mug"');
  });

  it("handles empty rows", () => {
    const csv = buildCsvString(["A", "B"], []);
    expect(csv).toBe("A,B\n");
  });
});
