// client/components/AuctionDetails.tsx
import React, { useEffect, useState } from "react";
import type { AuctionDTO } from "../domain/Auction";
import { AuctionService } from "../application/AuctionService";
import { AuctionApiClient } from "../infrastructure/AuctionApiClient";
import { env } from "../env/env";
interface Props {
  auction: AuctionDTO;
  token: string;
  onClose: () => void;
}

export const AuctionDetails: React.FC<Props> = ({ auction, token, onClose }) => {
  const [freshAuction, setFreshAuction] = useState<AuctionDTO>(auction);

  const apiClient = new AuctionApiClient(env.apiBase, token);
  const auctionService = new AuctionService(apiClient);

  useEffect(() => {
  const fetchAuction = async () => {
    try {
      const updated = await auctionService.getAuction(auction.id);
      if (updated) setFreshAuction(updated); // <-- solo setea si no es null
    } catch (err) {
      console.error("Error fetching auction details:", err);
    }
  };
  fetchAuction();
}, [auction, auctionService]);


  const getRemainingTime = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return "Finalizada";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m restantes`;
  };

  const buyNowPrice = freshAuction.buyNowPrice ?? 0;

  return (
    <div className="modal p-4 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-2">
        {freshAuction.title || freshAuction.item?.name}
      </h2>

      <p className="mb-2">
        <strong>Descripción:</strong>{" "}
        {freshAuction.description || freshAuction.item?.description || "Sin descripción"}
      </p>

      <p className="mb-2">
        <strong>Precio actual:</strong> {freshAuction.currentPrice}
      </p>

      {buyNowPrice > 0 && (
        <p className="mb-2">
          <strong>Precio compra rápida:</strong> {buyNowPrice}
        </p>
      )}

      <p className="mb-2">
        <strong>Estado:</strong> {freshAuction.status}
      </p>

      <p className="mb-2">
        <strong>Pujas totales:</strong> {freshAuction.bidsCount || 0}
      </p>

      {freshAuction.highestBid && (
        <p className="mb-2">
          <strong>Mayor puja:</strong> {freshAuction.highestBid.amount} por usuario {freshAuction.highestBid.userId}
        </p>
      )}

      <p className="mb-2">
        <strong>Inicio:</strong> {new Date(freshAuction.createdAt).toLocaleString()}
      </p>
      <p className="mb-2">
        <strong>Finaliza:</strong> {new Date(freshAuction.endsAt).toLocaleString()}
      </p>
      <p className="mb-2">
        <strong>Tiempo restante:</strong> {getRemainingTime(freshAuction.endsAt)}
      </p>

      {freshAuction.item && (
        <div className="mb-2">
          <strong>Item:</strong> {freshAuction.item.name} - {freshAuction.item.description}
          <br />
          <strong>Tipo:</strong> {freshAuction.item.type}
          {freshAuction.item.heroType && <span> ({freshAuction.item.heroType})</span>}
          <br />
          {freshAuction.item.imagen && (
            <img src={freshAuction.item.imagen} alt={freshAuction.item.name} className="w-32 h-32 object-cover mt-2" />
          )}
        </div>
      )}

      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
};


