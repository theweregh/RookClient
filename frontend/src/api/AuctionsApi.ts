// src/api/AuctionsApi.ts
import type { AuctionDTO } from "../domain/Auction";
import { env } from "../env/env";

const BASE_URL = `${env.apiBase}/auctions`;

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
  return json.data as AuctionDTO;
}
