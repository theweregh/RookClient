// src/api/AuctionsApi.ts
import type { AuctionDTO } from "../domain/Auction";

const BASE_URL = "http://localhost:3000/api/auctions";

export async function fetchAuctions(): Promise<AuctionDTO[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error al obtener subastas");
  const json = await res.json();
  return json.data as AuctionDTO[];
}

export async function fetchAuctionById(id: number): Promise<AuctionDTO> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error("Subasta no encontrada");
  const json = await res.json();
  return json.data as AuctionDTO; // <--- esto asegura que endsAt y highestBid estén presentes
}


