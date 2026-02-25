import { containsProfanity, filterProfanity, censorText } from "../profanity-filter";

describe("profanity-filter", () => {
  describe("containsProfanity", () => {
    it("detects profanity", () => {
      expect(containsProfanity("this is shit")).toBe(true);
      expect(containsProfanity("what the fuck")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(containsProfanity("SHIT")).toBe(true);
      expect(containsProfanity("Damn it")).toBe(true);
    });

    it("does not flag clean text", () => {
      expect(containsProfanity("Great coffee, loved the taste")).toBe(false);
      expect(containsProfanity("Excellent brew method")).toBe(false);
    });

    it("does not false-positive on 'class'", () => {
      expect(containsProfanity("This is a classic coffee")).toBe(false);
      expect(containsProfanity("world class beans")).toBe(false);
    });

    it("does not false-positive on 'assess'", () => {
      expect(containsProfanity("Let me assess the flavor")).toBe(false);
      expect(containsProfanity("assessment of quality")).toBe(false);
    });

    it("does not false-positive on 'scunthorpe'", () => {
      expect(containsProfanity("I'm from Scunthorpe")).toBe(false);
    });

    it("does not false-positive on 'cocktail'", () => {
      expect(containsProfanity("coffee cocktail recipe")).toBe(false);
    });

    it("does not false-positive on 'assumption'", () => {
      expect(containsProfanity("That's a fair assumption")).toBe(false);
    });
  });

  describe("filterProfanity", () => {
    it("returns clean for normal text", () => {
      const result = filterProfanity("Amazing coffee, will buy again");
      expect(result.clean).toBe(true);
      expect(result.flaggedWords).toEqual([]);
    });

    it("returns flagged words", () => {
      const result = filterProfanity("this shit is damn good");
      expect(result.clean).toBe(false);
      expect(result.flaggedWords).toContain("shit");
      expect(result.flaggedWords).toContain("damn");
    });

    it("deduplicates flagged words", () => {
      const result = filterProfanity("shit shit shit");
      expect(result.flaggedWords).toEqual(["shit"]);
    });
  });

  describe("censorText", () => {
    it("replaces profanity with first letter + asterisks", () => {
      expect(censorText("what the fuck")).toBe("what the f***");
      expect(censorText("this is shit")).toBe("this is s***");
    });

    it("is case-insensitive but preserves first letter case", () => {
      expect(censorText("FUCK this")).toBe("F*** this");
      expect(censorText("Damn it")).toBe("D*** it");
    });

    it("leaves clean text unchanged", () => {
      expect(censorText("Great coffee with classic flavor")).toBe(
        "Great coffee with classic flavor"
      );
    });

    it("censors multiple profanity words", () => {
      expect(censorText("shit and damn")).toBe("s*** and d***");
    });

    it("does not false-positive on 'class' or 'assess'", () => {
      expect(censorText("world class assessment")).toBe("world class assessment");
    });
  });
});
