import type { Integration } from "./types.js";

export const mail: Integration = {
  name: "mail",
  description: "Email delivery",
  packages: ["@minimajs/mail"],
  files: [
    {
      path: "src/mail.ts",
      content: `import { createMailer } from "@minimajs/mail";

export const mailer = createMailer({
  driver: "smtp",
  host: process.env.MAIL_HOST ?? "localhost",
  port: Number(process.env.MAIL_PORT ?? 1025),
});
`,
    },
  ],
};
