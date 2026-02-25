import { detectSpam } from "../spam-detector";

describe("detectSpam", () => {
  it("returns not spam for normal review text", () => {
    const result = detectSpam(
      "This coffee has a wonderful fruity flavor with notes of blueberry. Highly recommend!"
    );
    expect(result.isSpam).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it("flags content that is too short", () => {
    const result = detectSpam("Good.");
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain("Content too short");
  });

  it("flags excessive capitalization", () => {
    const result = detectSpam("THIS COFFEE IS THE BEST THING I HAVE EVER TASTED IN MY LIFE");
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain("Excessive capitalization");
  });

  it("does not flag short all-caps text", () => {
    const result = detectSpam("GREAT COFFEE!");
    expect(result.isSpam).toBe(false);
  });

  it("flags repeated characters", () => {
    const result = detectSpam("This coffee is sooooo goooood I love it very much");
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain("Repeated characters");
  });

  it("flags excessive URLs", () => {
    const result = detectSpam(
      "Check out https://spam.com and https://more-spam.com and https://even-more.com for deals"
    );
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain("Excessive URLs");
  });

  it("does not flag a single URL", () => {
    const result = detectSpam(
      "I found this great brewing guide at https://example.com that helped me brew this coffee perfectly"
    );
    expect(result.isSpam).toBe(false);
  });

  it("flags keyboard spam", () => {
    const result = detectSpam("asdfasdf qwerqwer this is keyboard spam content for testing");
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain("Keyboard spam");
  });

  it("can return multiple reasons", () => {
    const result = detectSpam("AAAAAAA https://a.com https://b.com https://c.com");
    expect(result.isSpam).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
