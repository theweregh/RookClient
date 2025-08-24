// client/application/AuctionService.ts
import type { AuctionDTO } from "../domain/Auction";
import { AuctionApiClient } from "../infrastructure/AuctionApiClient";

export interface CreateAuctionInput {
    userId: number;
    itemId: number;
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

    async getAuction(id: number): Promise<AuctionDTO> {
        return this.apiClient.getAuction(id);
    }

    async createAuction(input: CreateAuctionInput): Promise<AuctionDTO> {
        return this.apiClient.createAuction(input);
    }

    async placeBid(auctionId: number, userId: number, amount: number): Promise<boolean> {
        return this.apiClient.placeBid(auctionId, userId, amount);
    }

    async buyNow(auctionId: number, userId: number): Promise<boolean> {
        return this.apiClient.buyNow(auctionId, userId);
    }
}
