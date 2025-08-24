// src/components/AuctionDetails.tsx
import React from "react";
import type { AuctionDTO } from "../domain/Auction";

interface Props {
  auction: AuctionDTO;
  onClose: () => void;
}

export const AuctionDetails: React.FC<Props> = ({ auction, onClose }) => {
  return (
    <div className="modal p-4 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-2">{auction.title || auction.item?.name}</h2>
      <p className="mb-2"><strong>Descripción:</strong> {auction.description || auction.item?.description || "Sin descripción"}</p>
      <p className="mb-2"><strong>Precio actual:</strong> {auction.currentPrice}</p>
      {auction.buyNowPrice !== undefined && (
        <p className="mb-2"><strong>Precio compra rápida:</strong> {auction.buyNowPrice}</p>
      )}
      <p className="mb-2"><strong>Estado:</strong> {auction.status}</p>
      <p className="mb-2"><strong>Pujas totales:</strong> {auction.bidsCount || 0}</p>
      {auction.highestBid && (
        <p className="mb-2"><strong>Mayor puja:</strong> {auction.highestBid.amount} por usuario {auction.highestBid.userId}</p>
      )}
      {auction.bids && auction.bids.length > 0 && (
        <div className="mb-2">
          <strong>Historial de pujas:</strong>
          <ul className="list-disc ml-5">
            {auction.bids.map((b) => (
              <li key={b.id}>Usuario {b.userId}: {b.amount}</li>
            ))}
          </ul>
        </div>
      )}
      {auction.item && (
  <div className="mb-2">
    <strong>Item:</strong> {auction.item.name} - {auction.item.description}<br/>
    <strong>Tipo:</strong> {auction.item.type}
    {auction.item.heroType && <span> ({auction.item.heroType})</span>}<br/>
    {auction.item.imagen && (
      <img src={auction.item.imagen} alt={auction.item.name} className="w-32 h-32 object-cover mt-2"/>
    )}
  </div>
)}

      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>Cerrar</button>
    </div>
  );
};
