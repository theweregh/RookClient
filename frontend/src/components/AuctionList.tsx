import React from "react";
import type { AuctionDTO } from "../domain/Auction";

interface AuctionListProps {
  auctions: AuctionDTO[];
  onBid: (id: string) => void;
  onBuyNow: (id: string) => void;
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
      {auctions.map((auction) => {
        const buyNowPrice = auction.buyNowPrice ?? 0;

        return (
          <div key={auction.id} className="border p-2 mb-4 rounded shadow">
            {auction.item?.imagen && (
              <img
                src={auction.item.imagen.startsWith("data:")
                  ? auction.item.imagen
                  : `data:image/png;base64,${auction.item.imagen}`}
                alt={auction.item.name}
                className="w-32 h-32 object-cover rounded mb-2"
              />
            )}

            <h2 className="font-bold text-lg">
              {auction.title || auction.item?.name || "Subasta"}
            </h2>
            <p>{auction.description || auction.item?.description || "Sin descripción"}</p>
            <p>Precio actual: {auction.currentPrice}</p>

            {buyNowPrice > 0 && (
              <p>Precio compra rápida: {buyNowPrice}</p>
            )}

            <p>Estado: {auction.status}</p>

            <button
              className="bg-green-500 text-white px-2 py-1 m-1 rounded"
              onClick={() => onBid(auction.id)}
              disabled={auction.status !== "OPEN"}
            >
              Pujar
            </button>

            {buyNowPrice > 0 && auction.status === "OPEN" && (
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
        );
      })}
    </div>
  );
};

