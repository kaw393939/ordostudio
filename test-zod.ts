import { z } from "zod";
const schema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });
const parsed = schema.safeParse({});
if (!parsed.success) {
  console.log(parsed.error.issues);
}
