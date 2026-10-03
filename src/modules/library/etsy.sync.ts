import { prisma } from "../../db/client.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { sendEtsyPurchaseEmail } from "../../common/services/email.service.js";
import { EtsyService } from "./etsy.service.js";

export interface EtsyRawReceiptPayload {
  receipt_id: number | string;
  buyer_email?: string;
  name?: string;
  first_line?: string;
  second_line?: string;
  city?: string;
  state?: string;
  zip?: string;
  country_iso?: string;
  grandtotal?: { amount: number; divisor: number; currency_code: string };
  subtotal?: { amount: number; divisor: number; currency_code: string };
  total_tax_cost?: { amount: number; divisor: number; currency_code: string };
  total_shipping_cost?: { amount: number; divisor: number; currency_code: string };
  payment_method?: string;
  status?: string;
  was_paid?: boolean;
  was_shipped?: boolean;
  transactions?: Array<{
    transaction_id: number | string;
    title: string;
    listing_id: number | string;
    quantity: number;
    price?: { amount: number; divisor: number; currency_code: string };
  }>;
}

export class EtsySyncService {
  /**
   * Ingest and save a single Etsy order into the database & dispatch Email #1
   */
  static async ingestEtsyOrder(receipt: EtsyRawReceiptPayload) {
    const receiptId = String(receipt.receipt_id).trim().replace("#", "");
    if (!receiptId) return null;

    const buyerEmail = receipt.buyer_email || undefined;
    const buyerName = receipt.name || "Valued Reader";
    const isPaid = receipt.status === "paid" || receipt.status === "completed" || receipt.was_paid === true;
    const isShipped = receipt.was_shipped === true || receipt.status === "completed";

    // Determine if order contains eBook or Physical Book
    const targetEbookListingId = env.ETSY_GIGI_LISTING_ID || process.env.ETSY_GIGI_LISTING_ID;
    const transactions = receipt.transactions || [];
    
    let isEbook = true;
    let matchedListingId = targetEbookListingId;

    if (transactions.length > 0 && transactions[0]) {
      const firstTx = transactions[0];
      if (firstTx.listing_id) {
        matchedListingId = String(firstTx.listing_id);
      }
      // If title mentions physical / paperback or not matching target listing
      const titleLower = (firstTx.title || "").toLowerCase();
      if (titleLower.includes("physical") || titleLower.includes("paperback") || titleLower.includes("hardcover")) {
        isEbook = false;
      }
    }

    // Upsert into Etsy Order Claims / Ingestion Table
    const existing = await prisma.etsyOrderClaim.findUnique({
      where: { receiptId }
    });

    const record = await prisma.etsyOrderClaim.upsert({
      where: { receiptId },
      create: {
        receiptId,
        buyerEmail,
        buyerName,
        listingId: matchedListingId,
        bookSlug: "gigi-the-book",
        isClaimed: existing ? existing.isClaimed : false,
        claimedByUserId: existing ? existing.claimedByUserId : null,
      },
      update: {
        buyerEmail: buyerEmail ?? existing?.buyerEmail,
        buyerName: buyerName ?? existing?.buyerName,
        listingId: matchedListingId ?? existing?.listingId,
      }
    });

    logger.info({ receiptId, isPaid, isEbook }, "[EtsySyncService] Successfully saved Etsy order to database");

    // Dispatch Email #1 if this is a newly detected order with buyer email
    if (!existing && buyerEmail && isPaid && isEbook) {
      try {
        await sendEtsyPurchaseEmail(buyerEmail, {
          buyer_name: buyerName,
          order_id: receiptId,
          item_title: "Gigi the Book: A Journey of Growing Up (Cloud Edition)",
          redeem_url: `https://infanocare.com/redeem?order_id=${encodeURIComponent(receiptId)}`
        });
        logger.info({ receiptId, buyerEmail }, "[EtsySyncService] Dispatched Email #1 (Access Code) to buyer");
      } catch (emailErr) {
        logger.error({ emailErr, receiptId }, "[EtsySyncService] Failed to send Email #1 to buyer");
      }
    }

    return record;
  }

  /**
   * Proactively poll Etsy Open API for newly placed orders
   */
  static async syncRecentOrdersFromEtsy(lookbackHours = 24) {
    const keystring = env.ETSY_KEYSTRING || process.env.ETSY_KEYSTRING;
    const shopId = env.ETSY_SHOP_ID || process.env.ETSY_SHOP_ID;
    const accessToken = process.env.ETSY_ACCESS_TOKEN;

    if (!keystring || !shopId || shopId.includes("your_etsy") || (accessToken && accessToken.includes("your_oauth"))) {
      logger.info("[EtsySyncService] ETSY credentials are in placeholder mode. Skipping live sync.");
      return { synced: 0, message: "Etsy credentials not configured" };
    }

    const minCreated = Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000);
    const url = `https://openapi.etsy.com/v3/application/shops/${shopId}/receipts?min_created=${minCreated}&was_paid=true&limit=100`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": keystring,
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, errText }, "[EtsySyncService] Etsy API sync error");
        return { synced: 0, error: errText };
      }

      const data = await response.json() as { count: number; results: EtsyRawReceiptPayload[] };
      const receipts = data.results || [];
      let syncedCount = 0;

      for (const receipt of receipts) {
        await this.ingestEtsyOrder(receipt);
        syncedCount++;
      }

      logger.info({ syncedCount }, "[EtsySyncService] Batch sync completed successfully");
      return { synced: syncedCount, totalFound: data.count };
    } catch (error: any) {
      logger.error({ error: error.message }, "[EtsySyncService] Unexpected error during Etsy sync");
      return { synced: 0, error: error.message };
    }
  }
}
