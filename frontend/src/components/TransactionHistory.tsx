// src/components/TransactionHistory.tsx
import React, { useEffect, useState } from "react";
import type { AuctionDTO } from "../domain/Auction";
import { AuctionApiClient } from "../infrastructure/AuctionApiClient";
import { io, Socket } from "socket.io-client";

interface Props {
  token: string;
  userId: number;
}

export const TransactionHistory: React.FC<Props> = ({ token, userId }) => {
  const [purchased, setPurchased] = useState<AuctionDTO[]>([]);
  const [sold, setSold] = useState<AuctionDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [usernames, setUsernames] = useState<Record<number, string>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchUsername = async (id: number): Promise<string> => {
    if (usernames[id]) return usernames[id]; // cache
    const res = await fetch(`http://localhost:3000/api/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return "N/A";
    const data = await res.json();
    setUsernames((prev) => ({ ...prev, [id]: data.username }));
    return data.username;
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const api = new AuctionApiClient("http://localhost:3000/api", token);

      const purchasedData = await api.getPurchasedAuctions(userId);
      const soldData = await api.getSoldAuctions(userId);

      setPurchased(
        purchasedData.sort(
          (a: any, b: any) =>
            new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()
        )
      );
      setSold(
        soldData.sort(
          (a: any, b: any) =>
            new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()
        )
      );

      // precargar usernames
      const userIds = [
        ...purchasedData.map((a) => a.item?.userId),
        ...soldData.map((a) => a.highestBidderId),
      ].filter(Boolean) as number[];

      await Promise.all(userIds.map((id) => fetchUsername(id)));
    } catch (err) {
      console.error("Error fetching transaction history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!token || !userId) return;

  fetchHistory();

  const s: Socket = io("http://localhost:3000", { auth: { token } });
  setSocket(s);

  s.on("connect", () => console.log("[SOCKET] connected:", s.id));
  s.on("disconnect", (reason) => console.log("[SOCKET] disconnected:", reason));

  // Manejar cierre de subasta / compra rápida
  s.on("AUCTION_CLOSED", (auction: AuctionDTO) => {
    console.log("[SOCKET] AUCTION_CLOSED:", auction);

    // Si soy comprador
    if (auction.highestBidderId === userId) {
      setPurchased((prev) => {
        const exists = prev.find((a) => a.id === auction.id);
        if (exists) return prev.map((a) => (a.id === auction.id ? auction : a));
        return [auction, ...prev];
      });
    }

    // Si soy vendedor
    if (auction.item?.userId === userId) {
      setSold((prev) => {
        const exists = prev.find((a) => a.id === auction.id);
        if (exists) return prev.map((a) => (a.id === auction.id ? auction : a));
        return [auction, ...prev];
      });
    }

    // Precargar usernames involucrados
    if (auction.item?.userId) fetchUsername(auction.item.userId);
    if (auction.highestBidderId) fetchUsername(auction.highestBidderId);
  });

  return () => {
    s.off("AUCTION_CLOSED");
    s.disconnect();
  };
}, [token, userId]);


  if (loading) return <p>Cargando historial...</p>;

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-4">Historial de Transacciones</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Items Comprados</h3>
        {purchased.length === 0 && <p>No has comprado items.</p>}
        {purchased.map((a) => (
          <div key={a.id} className="border p-2 rounded mb-2">
            <strong>{a.item?.name}</strong> - $
            {a.highestBid?.amount || a.buyNowPrice} <br />
            Vendedor: {a.item?.userId ? usernames[a.item.userId] : "N/A"} <br />
            Fecha: {new Date(a.endsAt).toLocaleString()}
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Items Vendidos</h3>
        {sold.length === 0 && <p>No has vendido items.</p>}
        {sold.map((a) => (
          <div key={a.id} className="border p-2 rounded mb-2">
            <strong>{a.item?.name}</strong> - $
            {a.highestBid?.amount || a.buyNowPrice} <br />
            Comprador: {a.highestBidderId ? usernames[a.highestBidderId] : "N/A"}{" "}
            <br />
            Fecha: {new Date(a.endsAt).toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  );
};
