// client/domain/Auction.ts
// client/domain/Auction.ts
import type { Item } from "./Item";

export interface AuctionDTO {
    id: string;
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
    highestBidderId?: string;

    item?: Item; // <-- agregar aquí
}


export interface BidDTO {
    id: string;
    auctionId: string;
    userId: string;
    amount: number;
    createdAt?: string;       // si tu backend usa timestamp, podrías mapearlo
    timestamp?: string;       // para mantener consistencia con backend
}
