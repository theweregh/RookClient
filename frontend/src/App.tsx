// src/App.tsx
import React, { useEffect, useState } from "react";
import type { AuctionDTO } from "./domain/Auction";
import type { Item } from "./domain/Item";
import { AuctionList } from "./components/AuctionList";
import { AuctionDetails } from "./components/AuctionDetails";
import { CreateAuctionForm } from "./components/CreateAuctionForm";
import { AuctionApiClient } from "./infrastructure/AuctionApiClient";
import { AuctionService } from "./application/AuctionService";
import type { CreateAuctionInput } from "./application/AuctionService";
import { io, Socket } from "socket.io-client";

// --- Inicializar cliente y servicio ---
const apiClient = new AuctionApiClient("http://localhost:3000/api");
const auctionService = new AuctionService(apiClient);
const itemsBaseUrl = "http://localhost:3000/api";

export const App: React.FC = () => {
  const [auctions, setAuctions] = useState<AuctionDTO[]>([]);
  const [selected, setSelected] = useState<AuctionDTO | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [socket] = useState<Socket>(() => io("http://localhost:3000"));

  // --- Fetch inicial de subastas ---
  const fetchAuctions = async () => {
    try {
      const data = await auctionService.listAuctions();
      console.log("[CLIENT] Subastas iniciales:", data);
      setAuctions(data);
    } catch (err) {
      console.error("Error fetching auctions:", err);
    }
  };

  // --- Fetch inicial de items ---
  const fetchItems = async () => {
    try {
      const res = await fetch(`${itemsBaseUrl}/items?userId=1`);
      if (!res.ok) throw new Error(`Error fetching items: ${res.statusText}`);
      const data: Item[] = await res.json();
      console.log("[CLIENT] Items iniciales:", data);

      if (Array.isArray(data) && data.length > 0) {
        setItems(data);
        setSelectedItemId(data[0].id);
      } else {
        setItems([]);
        setSelectedItemId(null);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
      setItems([]);
      setSelectedItemId(null);
    }
  };

  // --- Efecto inicial y escucha de socket ---
  useEffect(() => {
    fetchAuctions();
    fetchItems();

    console.log("[CLIENT] Conectando socket...");

    // --- Eventos socket ---
    socket.on("NEW_AUCTION", (auction: AuctionDTO) => {
      console.log("[SOCKET] NEW_AUCTION recibido:", auction);
      setAuctions((prev) => {
        if (prev.some(a => a.id === auction.id)) return prev; // evitar duplicados
        return [...prev, auction];
      });
    });

    socket.on("AUCTION_UPDATED", (auction: AuctionDTO) => {
      console.log("[SOCKET] AUCTION_UPDATED recibido:", auction);
      setAuctions((prev) =>
        prev.map((a) => (a.id === auction.id ? auction : a))
      );
    });

    socket.on("AUCTION_CLOSED", (auction: AuctionDTO) => {
      console.log("[SOCKET] AUCTION_CLOSED recibido:", auction);
      setAuctions((prev) =>
        prev.map((a) => (a.id === auction.id ? auction : a))
      );
    });

    return () => {
      socket.off("NEW_AUCTION");
      socket.off("AUCTION_UPDATED");
      socket.off("AUCTION_CLOSED");
    };
  }, [socket]);

  // --- Pujar ---
  const handleBid = (id: number) => {
    const amountStr = prompt("Ingrese monto de la puja:");
    if (!amountStr) return;
    const amount = Number(amountStr);

    console.log("[CLIENT] Enviando PLACE_BID:", { auctionId: id, userId: 1, amount });

    socket.emit("PLACE_BID", { auctionId: id, userId: 1, amount });

    // Actualización local inmediata (opcional, pero puede eliminarse si prefieres que el socket maneje todo)
    setAuctions((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              currentPrice: amount,
              highestBid: { id: a.highestBid?.id || 0, auctionId: a.id, userId: 1, amount },
              bidsCount: (a.bidsCount || 0) + 1,
              bids: [...(a.bids || []), { id: (a.bids?.length || 0) + 1, auctionId: a.id, userId: 1, amount }],
            }
          : a
      )
    );
  };

  // --- Compra rápida ---
  const handleBuyNow = (id: number) => {
    console.log("[CLIENT] Enviando BUY_NOW:", { auctionId: id, userId: 1 });
    socket.emit("BUY_NOW", { auctionId: id, userId: 1 });

    setAuctions((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: "CLOSED", currentPrice: a.buyNowPrice || a.currentPrice }
          : a
      )
    );
  };

  // --- Crear subasta ---
  const handleCreate = (input: Omit<CreateAuctionInput, "itemId">) => {
    if (!selectedItemId) return;
    const payload = { ...input, itemId: selectedItemId };
    console.log("[CLIENT] Enviando CREATE_AUCTION:", payload);

    // No actualizamos localmente; el socket se encarga de agregar la subasta
    socket.emit("CREATE_AUCTION", payload);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subastas Activas</h1>

      {/* Selección de item */}
      <div className="mb-4">
        <label>Selecciona un item: </label>
        <select
          value={selectedItemId ?? undefined}
          onChange={(e) => setSelectedItemId(Number(e.target.value))}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Formulario de creación */}
      <CreateAuctionForm onCreate={handleCreate} />

      {/* Lista de subastas */}
      <AuctionList
        auctions={auctions}
        onBid={handleBid}
        onBuyNow={handleBuyNow}
        onViewDetails={setSelected}
      />

      {/* Modal de detalles */}
      {selected && <AuctionDetails auction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
