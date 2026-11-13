import { describe, expect, it } from "vitest";
import { certificationSchema, educationSchema, personalInformationSchema, preferencesSchema, projectSchema } from "./profile.schema";

describe("candidate profile schemas", () => {
  it("requires a name and validates international phone numbers and URLs", () => {
    expect(personalInformationSchema.safeParse({ full_name: "" }).success).toBe(false);
    expect(personalInformationSchema.safeParse({ full_name: "Casey Candidate", phone_number: "555-1234" }).success).toBe(false);
    expect(personalInformationSchema.safeParse({ full_name: "Casey Candidate", portfolio_url: "portfolio" }).success).toBe(false);
    expect(personalInformationSchema.safeParse({ full_name: "Casey Candidate", phone_number: "+14155552671", portfolio_url: "https://example.com" }).success).toBe(true);
  });

  it("rejects reversed education, project, and certification dates", () => {
    expect(educationSchema.safeParse({ institution_name: "Uni", degree: "BS", start_date: "2024-01-01", end_date: "2023-01-01", is_currently_studying: false }).success).toBe(false);
    expect(projectSchema.safeParse({ project_name: "Portfolio", technologies_text: "React", start_date: "2024-01-01", end_date: "2023-01-01", is_ongoing: false }).success).toBe(false);
    expect(certificationSchema.safeParse({ certification_name: "Cloud", issuing_organization: "Org", issue_date: "2024-01-01", expiration_date: "2023-01-01", does_not_expire: false }).success).toBe(false);
  });

  it("rejects salary ranges whose minimum exceeds their maximum", () => {
    expect(preferencesSchema.safeParse({ titles_text: "", locations_text: "", employment: [], modes: [], minimum_expected_salary: "120000", maximum_expected_salary: "90000", preferred_experience_level: "", willing_to_relocate: false, available_to_join: "", industries_text: "" }).success).toBe(false);
  });
});
