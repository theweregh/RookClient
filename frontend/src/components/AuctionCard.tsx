import React from "react";
import type { AuctionDTO } from "../domain/Auction";


interface Props {
  auction: AuctionDTO;
  onBid: (id: number) => void;
  onBuyNow: (id: number) => void;
  onViewDetails: (auction: AuctionDTO) => void;
}

export const AuctionCard: React.FC<Props> = ({ auction, onBid, onBuyNow, onViewDetails }) => {
  return (
    <div className="border rounded p-4 m-2 w-64 shadow">
      <div className="h-40 bg-gray-200 flex items-center justify-center">
        <span>Imagen</span>
      </div>
      <h3 className="font-bold mt-2">{auction.title}</h3>
      <p>Precio actual: ${auction.currentPrice}</p>
      <p>Estado: {auction.status}</p>
      <div className="flex justify-between mt-2">
        <button onClick={() => onBid(auction.id)} className="bg-blue-500 text-white px-2 py-1 rounded">
          Pujar
        </button>
        {auction.buyNowPrice && (
          <button onClick={() => onBuyNow(auction.id)} className="bg-green-500 text-white px-2 py-1 rounded">
            Compra rápida
          </button>
        )}
      </div>
      <button onClick={() => onViewDetails(auction)} className="mt-2 text-sm text-gray-600">
        Más detalles
      </button>
    </div>
  );
};
