import React, { useEffect, useState } from "react";
import type { AuctionDTO } from "../domain/Auction";
import { Socket } from "socket.io-client";
import { env } from "../env/env";
interface Props {
  token: string;
  userId: number;
  socket?: Socket | null;
  purchased: AuctionDTO[];
  sold: AuctionDTO[];
}

export const TransactionHistory: React.FC<Props> = ({
  token,
  userId,
  socket,
  purchased,
  sold,
}) => {
  const [usernames, setUsernames] = useState<Record<number, string>>({});

  // Función para obtener username de un userId
  const fetchUsername = async (id: number): Promise<string> => {
    if (usernames[id]) return usernames[id];
    try {
      const res = await fetch(`${env.apiBase}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return "N/A";
      const data = await res.json();
      setUsernames((prev) => ({ ...prev, [id]: data.username }));
      return data.username;
    } catch (err) {
      console.error("[fetchUsername] Error:", err);
      return "N/A";
    }
  };

  // Precargar usernames cada vez que cambian purchased o sold
  useEffect(() => {
    const ids = [
      ...purchased.map((a) => a.item?.userId),
      ...sold.map((a) => a.highestBidderId),
    ].filter(Boolean) as number[];

    ids.forEach((id) => {
      fetchUsername(id).then((name) =>
        console.log("[USERNAME FETCHED]", id, "->", name)
      );
    });
  }, [purchased, sold]);

  // Escuchar eventos de socket para logs
  useEffect(() => {
    if (!socket) return;

    const refresh = (event: string) => {
      console.log(`[SOCKET] Evento recibido: ${event} - Historial debería actualizarse desde App.tsx`);
    };

    socket.on("TRANSACTION_CREATED", () => refresh("TRANSACTION_CREATED"));
    socket.on("AUCTION_CLOSED", () => refresh("AUCTION_CLOSED"));

    return () => {
      socket.off("TRANSACTION_CREATED");
      socket.off("AUCTION_CLOSED");
    };
  }, [socket]);

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-4">Historial de Transacciones</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Items Comprados</h3>
        {purchased.length === 0 && <p>No has comprado items.</p>}
        {purchased.map((a) => (
          <div key={a.id} className="border p-2 rounded mb-2">
            <strong>{a.item?.name}</strong> - $
            {a.highestBid?.amount || a.buyNowPrice || 0}
            <br />
            Vendedor: {a.item?.userId ? usernames[a.item.userId] || "..." : "N/A"}
            <br />
            Fecha: {a.endsAt ? new Date(a.endsAt).toLocaleString() : "N/A"}
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Items Vendidos</h3>
        {sold.length === 0 && <p>No has vendido items.</p>}
        {sold.map((a) => (
          <div key={a.id} className="border p-2 rounded mb-2">
            <strong>{a.item?.name}</strong> - $
            {a.highestBid?.amount || a.buyNowPrice || 0}
            <br />
            Comprador: {a.highestBidderId ? usernames[a.highestBidderId] || "..." : "N/A"}
            <br />
            Fecha: {a.endsAt ? new Date(a.endsAt).toLocaleString() : "N/A"}
          </div>
        ))}
      </div>
    </div>
  );
};
