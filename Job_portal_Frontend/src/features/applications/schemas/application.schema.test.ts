import { describe, expect, it } from "vitest";
import { applicationSchema } from "./application.schema";

describe("application submission validation",()=>{
 it("allows an optional resume and cover letter within the limit",()=>{expect(applicationSchema.safeParse({cover_letter:"Interested in the role."}).success).toBe(true);});
 it("validates PDF extension, MIME type, file size, and cover letter length",()=>{
  expect(applicationSchema.safeParse({resume:new File(["pdf"],"resume.pdf",{type:"application/pdf"}),cover_letter:""}).success).toBe(true);
  expect(applicationSchema.safeParse({resume:new File(["text"],"resume.txt",{type:"text/plain"}),cover_letter:""}).success).toBe(false);
  expect(applicationSchema.safeParse({cover_letter:"x".repeat(5001)}).success).toBe(false);
  expect(applicationSchema.safeParse({resume:new File([new Uint8Array(5*1024*1024+1)],"large.pdf",{type:"application/pdf"}),cover_letter:""}).success).toBe(false);
 });
});
