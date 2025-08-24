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
  const [filteredAuctions, setFilteredAuctions] = useState<AuctionDTO[]>([]);
  const [selected, setSelected] = useState<AuctionDTO | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [socket] = useState<Socket>(() => io("http://localhost:3000"));

  // --- Filtros ---
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);

  // --- Fetch inicial de subastas ---
  const fetchAuctions = async () => {
    try {
      const data = await auctionService.listAuctions();
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

      setItems(data);
      setSelectedItemId(data.length > 0 ? data[0].id : null);
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

    socket.on("NEW_AUCTION", (auction: AuctionDTO) => {
      setAuctions((prev) => {
        if (prev.some(a => a.id === auction.id)) return prev;
        return [...prev, auction];
      });
    });

    socket.on("AUCTION_UPDATED", (auction: AuctionDTO) => {
      setAuctions((prev) => prev.map((a) => (a.id === auction.id ? auction : a)));
    });

    socket.on("AUCTION_CLOSED", (auction: AuctionDTO) => {
      setAuctions((prev) => prev.map((a) => (a.id === auction.id ? auction : a)));
    });

    return () => {
      socket.off("NEW_AUCTION");
      socket.off("AUCTION_UPDATED");
      socket.off("AUCTION_CLOSED");
    };
  }, [socket]);

  // --- Filtros ---
  const applyFilters = () => {
    const results = auctions.filter((a) => {
      const matchName = filterName.length >= 4 ? a.title.toLowerCase().includes(filterName.toLowerCase()) : true;
      const normalize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const matchType = filterType
  ? normalize(a.item?.type || "") === normalize(filterType)
  : true;

      const remainingHours = (new Date(a.endsAt).getTime() - Date.now()) / (1000 * 60 * 60);
      const matchDuration = filterDuration ? remainingHours <= filterDuration : true;
      const matchPrice = filterMaxPrice ? a.currentPrice <= filterMaxPrice : true;

      return matchName && matchType && matchDuration && matchPrice;
    });
    setFilteredAuctions(results);
  };

  // --- Pujar ---
  const handleBid = (id: number) => {
    const amountStr = prompt("Ingrese monto de la puja:");
    if (!amountStr) return;
    const amount = Number(amountStr);

    socket.emit("PLACE_BID", { auctionId: id, userId: 1, amount });

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
    socket.emit("CREATE_AUCTION", { ...input, itemId: selectedItemId });
  };
  const uniqueTypes = Array.from(new Set(items.map((item) => item.type)));
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subastas Activas</h1>

      {/* Filtros */}
      <div className="mb-4 p-2 border rounded">
        <h3 className="font-bold mb-2">Filtros de búsqueda</h3>
        <input
          type="text"
          placeholder="Nombre (mín 4 caracteres)"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="border p-1 mr-2"
        />
        <select
  value={filterType}
  onChange={(e) => {
    setFilterType(e.target.value);
    // aplicamos los filtros inmediatamente
    setTimeout(() => applyFilters(), 0); 
  }}
  className="border p-1 mr-2"
>

  
  <option value="">Todos los tipos</option>
  {uniqueTypes.map((type) => (
    <option key={type} value={type}>
      {type}
    </option>
  ))}
</select>

        <input
          type="number"
          placeholder="Duración máxima (horas)"
          value={filterDuration ?? ""}
          onChange={(e) => setFilterDuration(Number(e.target.value) || null)}
          className="border p-1 mr-2"
        />
        <input
          type="number"
          placeholder="Precio máximo"
          value={filterMaxPrice ?? ""}
          onChange={(e) => setFilterMaxPrice(Number(e.target.value) || null)}
          className="border p-1 mr-2"
        />
        <button onClick={applyFilters} className="bg-blue-500 text-white px-3 py-1 rounded">
          Buscar
        </button>
      </div>

      {/* Selección de item */}
      <div className="mb-4">
        <label>Selecciona un item: </label>
        <select value={selectedItemId ?? undefined} onChange={(e) => setSelectedItemId(Number(e.target.value))}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      {/* Formulario de creación */}
      <CreateAuctionForm onCreate={handleCreate} />

      {/* Lista de subastas */}
      <AuctionList
        auctions={filteredAuctions.length || filterName || filterType || filterDuration || filterMaxPrice ? filteredAuctions : auctions}
        onBid={handleBid}
        onBuyNow={handleBuyNow}
        onViewDetails={setSelected}
      />

      {/* Modal de detalles */}
      {selected && <AuctionDetails auction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
