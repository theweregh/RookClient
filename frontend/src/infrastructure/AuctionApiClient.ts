import type { AuctionDTO } from "../domain/Auction";

export class AuctionApiClient {
    private readonly baseUrl: string; // propiedad explícita

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl; // asignación normal
    }

    async listAuctions(): Promise<AuctionDTO[]> {
  const res = await fetch(`${this.baseUrl}/auctions`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error listing auctions: ${res.status} ${text}`);
  }
  const data = await res.json();

  return data.data.map((a: any) => ({
    id: a.id,
    title: a.item.name,
    description: a.item.description,
    startingPrice: a.startingPrice,
    currentPrice: a.currentPrice,
    buyNowPrice: a.buyNowPrice,
    status: a.status,
    createdAt: a.createdAt,
    endsAt: a.endsAt,              // <--- agregar
    bids: a.bids || [],            // aunque sea vacío
    bidsCount: a.bidsCount || 0,   // <--- agregar
    highestBid: a.highestBid,      // <--- agregar
    highestBidderId: a.highestBidderId, // opcional
  }));
}


    async getAuction(id: number): Promise<AuctionDTO> {
    const res = await fetch(`${this.baseUrl}/auctions/${id}`);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error getting auction ${id}: ${res.status} ${text}`);
    }
    const raw = await res.json();

    const a = raw.data; // si tu backend envía { data: auction }
    return {
        id: a.id,
        title: a.item.name,
        description: a.item.description,
        startingPrice: a.startingPrice,
        currentPrice: a.currentPrice,
        buyNowPrice: a.buyNowPrice,
        status: a.status,
        createdAt: a.createdAt,
        endsAt: a.endsAt,
        bids: a.bids || [],
        bidsCount: a.bidsCount || 0,
        highestBid: a.highestBid,
        highestBidderId: a.highestBidderId,
    };
}


    async createAuction(input: any): Promise<AuctionDTO> {
        const res = await fetch(`${this.baseUrl}/auctions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error creating auction");
        }
        const data = await res.json();
        return data.auction;
    }

    async placeBid(auctionId: number, userId: number, amount: number): Promise<boolean> {
        const res = await fetch(`${this.baseUrl}/auctions/${auctionId}/bid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, amount }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error placing bid");
        }
        const data = await res.json();
        return data.success;
    }

    async buyNow(auctionId: number, userId: number): Promise<boolean> {
        const res = await fetch(`${this.baseUrl}/auctions/${auctionId}/buy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error buying now");
        }
        const data = await res.json();
        return data.success;
    }
}

