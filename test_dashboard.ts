import { ParentService } from './src/modules/parent/parent.service.js';

async function main() {
  const userId = '287fa4fa-44da-4c20-860c-90d86e27c02b'; // Umesh Tandon
  const summary = await ParentService.getDashboardSummary(userId);
  console.log("Direct service call:", JSON.stringify(summary, null, 2));
}

main().catch(console.error);
