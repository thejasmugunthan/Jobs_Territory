import { z } from "zod";

export const applicationSchema = z.object({
  resume: z.instanceof(File).optional(),
  cover_letter: z.string().max(5000, "Cover letter must be 5,000 characters or fewer"),
}).superRefine((value, context) => {
  const file = value.resume;
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) context.addIssue({ code: "custom", path: ["resume"], message: "Choose a PDF file." });
  if (file.type !== "application/pdf") context.addIssue({ code: "custom", path: ["resume"], message: "The selected file must be a PDF." });
  if (file.size === 0) context.addIssue({ code: "custom", path: ["resume"], message: "The selected file is empty." });
  if (file.size > 5 * 1024 * 1024) context.addIssue({ code: "custom", path: ["resume"], message: "Resume must be 5 MB or smaller." });
});
export type ApplicationFormValues = z.infer<typeof applicationSchema>;
