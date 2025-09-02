// client/domain/Auction.ts
// client/domain/Auction.ts
import type { Item } from "./Item";

export interface AuctionDTO {
    id: number;
    title: string;
    description: string;
    startingPrice: number;
    currentPrice: number;
    buyNowPrice?: number;
    status: string;
    createdAt: string;
    endsAt: string;
    bids: BidDTO[];
    bidsCount: number;
    highestBid?: BidDTO;
    highestBidderId?: number;

    item?: Item; // <-- agregar aquí
}


export interface BidDTO {
    id: number;
    auctionId: number;
    userId: number;
    amount: number;
    createdAt?: string;       // si tu backend usa timestamp, podrías mapearlo
    timestamp?: string;       // para mantener consistencia con backend
}
