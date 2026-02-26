import { calculateCompletenessScore } from "../completeness-score";

describe("completeness-score", () => {
  it("returns minimal score for bare review", () => {
    const score = calculateCompletenessScore({
      content: "It was ok.",
      rating: 3,
    });
    // Only rating (0.05) — content too short (<15 words)
    expect(score).toBeLessThan(0.15);
  });

  it("returns full score for detailed brew report", () => {
    const score = calculateCompletenessScore({
      content:
        "I brewed this Ethiopian Yirgacheffe using a V60 pour-over method and was blown away by the results. The floral notes of jasmine and bergamot were immediately apparent on the first sip. The lemon acidity was bright but not overwhelming, creating a beautifully balanced cup. I used a medium-fine grind at 200°F with a 1:16.7 ratio and the extraction was perfect. The tea-like body was silky smooth. This is hands down one of the best light roasts I have ever tasted. Will definitely be ordering more.",
      title: "Best Ethiopian coffee I've ever had",
      rating: 5,
      brewMethod: "POUR_OVER_V60",
      tastingNotes: ["Floral", "Lemon", "Bergamot"],
      grindSize: "Medium-fine",
      waterTempF: 200,
      ratio: "1:16.7",
    });
    expect(score).toBeGreaterThan(0.9);
  });

  it("scales content score with word count", () => {
    const short = calculateCompletenessScore({
      content: "Great coffee, really enjoyed the taste and aroma of this blend. Nice body too. Will purchase again soon for sure.",
      rating: 4,
    });
    const long = calculateCompletenessScore({
      content:
        "I brewed this using a V60 pour-over method and was thoroughly impressed. The floral notes of jasmine and bergamot were immediately present. The lemon acidity was bright but balanced. The body was silky smooth and the finish lingered beautifully. I would describe this as a classic Ethiopian that delivers on every front. From bloom to final sip, each pour revealed new layers. The aroma alone was worth the price. I used a Hario V60 with Cafec filters.",
      rating: 4,
    });
    expect(long).toBeGreaterThan(short);
  });

  it("credits brew method", () => {
    const without = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
    });
    const with_ = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
      brewMethod: "POUR_OVER_V60",
    });
    expect(with_).toBeGreaterThan(without);
    expect(with_ - without).toBeCloseTo(0.15, 1);
  });

  it("credits tasting notes", () => {
    const without = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
    });
    const with_ = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
      tastingNotes: ["Chocolate"],
    });
    expect(with_ - without).toBeCloseTo(0.15, 1);
  });

  it("credits technical data", () => {
    const without = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
    });
    const with_ = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
      grindSize: "Medium",
    });
    expect(with_ - without).toBeCloseTo(0.1, 1);
  });

  it("credits title", () => {
    const without = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
    });
    const with_ = calculateCompletenessScore({
      content: "Good coffee with nice flavors overall",
      rating: 4,
      title: "Great coffee",
    });
    expect(with_ - without).toBeCloseTo(0.1, 1);
  });

  it("never exceeds 1.0", () => {
    const score = calculateCompletenessScore({
      content: "a ".repeat(100),
      title: "Title",
      rating: 5,
      brewMethod: "ESPRESSO",
      tastingNotes: ["Chocolate", "Caramel", "Nutty"],
      grindSize: "Fine",
      waterTempF: 200,
      ratio: "1:2",
    });
    expect(score).toBeLessThanOrEqual(1.0);
  });
});
