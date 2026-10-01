import { describe, it, expect } from "vitest";
import { joinBase } from "../src/basePath";

describe("joinBase (non-root deployment base path)", () => {
  it("resolves a data path under a project subpath", () => {
    expect(joinBase("/atm26/", "data/leaderboard.json")).toBe(
      "/atm26/data/leaderboard.json",
    );
  });

  it("resolves assets under a project subpath", () => {
    expect(joinBase("/atm26/", "assets/app.js")).toBe(
      "/atm26/assets/app.js",
    );
  });

  it("normalises a missing trailing slash on the base", () => {
    expect(joinBase("/ATM26-Website", "data/leaderboard.json")).toBe(
      "/ATM26-Website/data/leaderboard.json",
    );
  });

  it("strips leading slashes from the relative path", () => {
    expect(joinBase("/atm26/", "/data/leaderboard.json")).toBe("/atm26/data/leaderboard.json");
  });

  it("supports the root base", () => {
    expect(joinBase("/", "data/leaderboard.json")).toBe("/data/leaderboard.json");
  });
});
