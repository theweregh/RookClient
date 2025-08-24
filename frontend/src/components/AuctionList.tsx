// src/components/AuctionList.tsx
import React from "react";
import type { AuctionDTO } from "../domain/Auction";

interface AuctionListProps {
  auctions: AuctionDTO[];
  onBid: (id: number) => void;
  onBuyNow: (id: number) => void;
  onViewDetails: React.Dispatch<React.SetStateAction<AuctionDTO | null>>;
}

export const AuctionList: React.FC<AuctionListProps> = ({
  auctions,
  onBid,
  onBuyNow,
  onViewDetails,
}) => {
  return (
    <div>
      {auctions.length === 0 && <p>No hay subastas activas</p>}
      {auctions.map((auction) => (
        <div key={auction.id} className="border p-2 mb-2 rounded">
          <h2 className="font-bold">{auction.title || "Subasta"}</h2>
          <p>{auction.description || "Sin descripción"}</p>
          <p>Precio actual: {auction.currentPrice}</p>
          <p>Precio compra rápida: {auction.buyNowPrice ?? "N/A"}</p>
          <p>Estado: {auction.status}</p>
          <button
            className="bg-green-500 text-white px-2 py-1 m-1 rounded"
            onClick={() => onBid(auction.id)}
            disabled={auction.status !== "OPEN"}
          >
            Pujar
          </button>
          {auction.buyNowPrice && auction.status === "OPEN" && (
            <button
              className="bg-yellow-500 text-white px-2 py-1 m-1 rounded"
              onClick={() => onBuyNow(auction.id)}
            >
              Comprar
            </button>
          )}
          <button
            className="bg-blue-500 text-white px-2 py-1 m-1 rounded"
            onClick={() => onViewDetails(auction)}
          >
            Ver detalles
          </button>
        </div>
      ))}
    </div>
  );
};
