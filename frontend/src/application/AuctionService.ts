// client/application/AuctionService.ts
import type { AuctionDTO } from "../domain/Auction";
import { AuctionApiClient } from "../infrastructure/AuctionApiClient";

export interface CreateAuctionInput {
  itemId: string;
  startingPrice: number;
  buyNowPrice?: number;
  durationHours: number;
}

export class AuctionService {
  private readonly apiClient: AuctionApiClient;

  constructor(apiClient: AuctionApiClient) {
    this.apiClient = apiClient;
  }

  async listAuctions(): Promise<AuctionDTO[]> {
    return this.apiClient.listAuctions();
  }

  async getAuction(id: string): Promise<AuctionDTO | null> {
    return this.apiClient.getAuction(id);
  }

  async createAuction(input: CreateAuctionInput): Promise<AuctionDTO> {
    return this.apiClient.createAuction(input);
  }

  async placeBid(auctionId: string, amount: number): Promise<boolean> {
    return this.apiClient.placeBid(auctionId, amount);
  }

  async buyNow(auctionId: string): Promise<boolean> {
    return this.apiClient.buyNow(auctionId);
  }

  // 🔹 Nuevos métodos para historial
  async getPurchasedAuctions(userId: string): Promise<AuctionDTO[]> {
    return this.apiClient.getPurchasedAuctions(userId);
  }

  async getSoldAuctions(userId: string): Promise<AuctionDTO[]> {
    return this.apiClient.getSoldAuctions(userId);
  }
}
