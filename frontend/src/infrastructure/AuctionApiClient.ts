// client/infrastructure/AuctionApiClient.ts
import type { AuctionDTO } from "../domain/Auction";

export class AuctionApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async listAuctions(): Promise<AuctionDTO[]> {
    const res = await fetch(`${this.baseUrl}/auctions`, {
      headers: this.getHeaders(),
    });
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
      endsAt: a.endsAt,
      bids: a.bids || [],
      bidsCount: a.bidsCount || 0,
      highestBid: a.highestBid,
      highestBidderId: a.highestBidderId,
      item: a.item,
    }));
  }

  async getAuction(id: number): Promise<AuctionDTO> {
    const res = await fetch(`${this.baseUrl}/auctions/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error getting auction ${id}: ${res.status} ${text}`);
    }
    const a = (await res.json()).data;
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
      item: a.item,
    };
  }

  async createAuction(input: any): Promise<AuctionDTO> {
    const res = await fetch(`${this.baseUrl}/auctions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error creating auction");
    }
    const data = await res.json();
    return data.auction;
  }

  async placeBid(auctionId: number, amount: number): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/auctions/${auctionId}/bid`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error placing bid");
    }
    const data = await res.json();
    return data.success;
  }

  async buyNow(auctionId: number): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/auctions/${auctionId}/buy`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error buying now");
    }
    const data = await res.json();
    return data.success;
  }
}


