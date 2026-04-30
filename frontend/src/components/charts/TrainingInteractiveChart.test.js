import { getRollingSpeedSeries } from "./TrainingInteractiveChart";

describe("getRollingSpeedSeries", () => {
  it("smooths WPM and rWPM over a short word window", () => {
    const series = getRollingSpeedSeries([
      {
        correct: "alpha",
        typed: "alpha",
        duration: 1,
      },
      {
        correct: "bravo",
        typed: "braco",
        duration: 1,
      },
      {
        correct: "charlie",
        typed: "charlie",
        duration: 1,
      },
      {
        correct: "delta",
        typed: "delta",
        duration: 1,
      },
      {
        correct: "echo",
        typed: "echo",
        duration: 1,
      },
      {
        correct: "foxtrot",
        typed: "foxtrot",
        duration: 1,
      },
    ]);

    expect(series.map((item) => item.wpm)).toEqual([72, 36, 56, 60, 60, 62]);
    expect(series.map((item) => item.rwpm)).toEqual([72, 72, 80, 78, 74, 77]);
  });
});
