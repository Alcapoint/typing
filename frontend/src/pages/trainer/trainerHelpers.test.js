import { decorateWordsWithProgressMetrics } from "./trainerHelpers";

describe("decorateWordsWithProgressMetrics", () => {
  it("uses local word speed for graph WPM and rWPM", () => {
    const words = decorateWordsWithProgressMetrics([
      {
        correct: "alpha",
        typed: "alpha",
        duration: 1,
        burst: 60,
      },
      {
        correct: "bravo",
        typed: "braco",
        duration: 1,
        burst: 60,
      },
      {
        correct: "charlie",
        typed: "charlie",
        duration: 1,
        burst: 84,
      },
    ]);

    expect(words.map((word) => word.wpm)).toEqual([72, 0, 84]);
    expect(words.map((word) => word.rwpm)).toEqual([72, 72, 84]);
    expect(words.map((word) => word.progress_wpm)).toEqual([72, 36, 52]);
    expect(words.map((word) => word.progress_rwpm)).toEqual([72, 72, 76]);
  });
});
