import { emailService } from "../src/common/services/email.service.js";

async function run() {
  console.log("Sending test email...");
  const success = await emailService.sendEnquiryConfirmation("jaisanu810@gmail.com", "Test User");
  console.log("Success:", success);
  process.exit(0);
}

run();
