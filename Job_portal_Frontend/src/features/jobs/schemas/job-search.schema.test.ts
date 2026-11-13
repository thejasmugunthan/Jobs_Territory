import { describe, expect, it } from "vitest";
import { searchParamsToInput, toApiSearchParams } from "./job-search.schema";

describe("job search query contract", () => {
  it("validates URL state and serializes repeated backend parameters", () => {
    const parsed = searchParamsToInput(new URLSearchParams("q=designer&location=India&employment_type=full_time&employment_type=contract&skills=Figma&skills=Research&page=2"));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const query = toApiSearchParams(parsed.data);
    expect(query.getAll("employment_type")).toEqual(["full_time", "contract"]);
    expect(query.getAll("skills")).toEqual(["Figma", "Research"]);
    expect(query.get("page")).toBe("2");
  });

  it("rejects reversed bounds, missing salary currency, and relevance without a query", () => {
    expect(searchParamsToInput(new URLSearchParams("min_salary=20000&max_salary=10000&currency=INR")).success).toBe(false);
    expect(searchParamsToInput(new URLSearchParams("min_salary=10000")).success).toBe(false);
    expect(searchParamsToInput(new URLSearchParams("sort_by=relevant")).success).toBe(false);
  });

  it("accepts the older top-nav search query and normalizes it", () => {
    const parsed = searchParamsToInput(new URLSearchParams("search=engineer"));
    expect(parsed.success && parsed.data.q).toBe("engineer");
  });
});
