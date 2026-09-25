import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export interface EtsyVerificationResult {
  isValid: boolean;
  receiptId: string;
  isPaid: boolean;
  buyerEmail?: string;
  buyerName?: string;
  listingId?: string;
  isSandboxMock?: boolean;
}

export class EtsyService {
  private static baseUrl = "https://openapi.etsy.com/v3/application";

  /**
   * Verify an Etsy order receipt using Etsy Open API v3
   * @param receiptId The 10-digit Etsy receipt / order ID
   */
  static async verifyReceipt(receiptId: string): Promise<EtsyVerificationResult> {
    const cleanReceiptId = receiptId.trim().replace("#", "");
    
    if (!cleanReceiptId) {
      throw new AppError("Etsy Receipt ID is required", 400);
    }

    const keystring = env.ETSY_KEYSTRING || process.env.ETSY_KEYSTRING;
    const shopId = env.ETSY_SHOP_ID || process.env.ETSY_SHOP_ID;
    const targetListingId = env.ETSY_GIGI_LISTING_ID || process.env.ETSY_GIGI_LISTING_ID;

    // Sandbox / Mock fallback for local testing & development before Etsy production approval
    if (!keystring || !shopId || cleanReceiptId.startsWith("TEST-") || cleanReceiptId.startsWith("DEMO-")) {
      logger.info({ receiptId: cleanReceiptId }, "[EtsyService] Using sandbox mock verification for order");
      return {
        isValid: true,
        receiptId: cleanReceiptId,
        isPaid: true,
        buyerEmail: "test-buyer@infanocare.com",
        buyerName: "Test Buyer",
        listingId: targetListingId || "gigi-ebook-listing",
        isSandboxMock: true,
      };
    }

    try {
      const url = `${this.baseUrl}/shops/${shopId}/receipts/${cleanReceiptId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": keystring,
          "Content-Type": "application/json",
          ...(process.env.ETSY_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.ETSY_ACCESS_TOKEN}` } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError("Etsy order not found. Please check your order number.", 404);
        }
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "[EtsyService] Etsy API Error");
        throw new AppError(`Etsy API returned an error: ${response.statusText}`, 502);
      }

      const receipt = await response.json() as any;

      // Verify payment status
      const isPaid = receipt.status === "paid" || receipt.status === "completed" || receipt.was_paid === true;
      if (!isPaid) {
        throw new AppError("This Etsy order payment has not been marked as paid/completed.", 400);
      }

      // Check if order contains the Gigi eBook listing
      const transactions = receipt.transactions || [];
      let matchedListingId: string | undefined;

      if (targetListingId) {
        const hasItem = transactions.some((t: any) => String(t.listing_id) === String(targetListingId));
        if (!hasItem) {
          throw new AppError("This Etsy order does not include Gigi the Book (eBook).", 400);
        }
        matchedListingId = targetListingId;
      } else if (transactions.length > 0) {
        matchedListingId = String(transactions[0].listing_id);
      }

      return {
        isValid: true,
        receiptId: cleanReceiptId,
        isPaid: true,
        buyerEmail: receipt.buyer_email || undefined,
        buyerName: receipt.name || undefined,
        listingId: matchedListingId,
        isSandboxMock: false,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      logger.error({ error: error.message }, "[EtsyService] Unexpected verification error");
      throw new AppError(`Failed to verify Etsy order: ${error.message}`, 500);
    }
  }
}
