// Citation page: the published method papers offered to dataset users.
import { describe, it, expect } from "vitest";
import { CITATIONS } from "../src/content";
import { renderCitation } from "../src/pages";

describe("citation list", () => {
  it("lists the MICCAI 2026 EndoLINA localization paper", () => {
    const paper = CITATIONS.find((item) =>
      item.title.includes("Topology-constrained vision-language sequence modeling"),
    );
    expect(paper).toBeDefined();
    expect(paper?.authors).toContain("Luo, M.");
    expect(paper?.authors).toContain("Gu, Y.");
    expect(paper?.venue).toContain("MICCAI 2026 EndoLINA Workshop");
    expect(paper?.venue).toContain("LNCS 17275");
    expect(paper?.link).toContain("EndoLINA_005");
  });

  it("renders every entry with the EndoLINA paper link", () => {
    const html = renderCitation();
    expect((html.match(/<li>/g) ?? []).length).toBe(CITATIONS.length);
    expect(html).toContain("Topology-constrained vision-language sequence modeling");
    expect(html).toContain("papers.miccai.org/miccai-2026-sat/paper/EndoLINA_005.pdf");
  });
});
