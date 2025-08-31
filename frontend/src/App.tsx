import React, { useEffect, useState, useMemo } from "react";
import type { AuctionDTO } from "./domain/Auction";
import type { Item } from "./domain/Item";
import { AuctionList } from "./components/AuctionList";
import { AuctionDetails } from "./components/AuctionDetails";
import { CreateAuctionForm } from "./components/CreateAuctionForm";
import { AuctionApiClient } from "./infrastructure/AuctionApiClient";
import { AuctionService } from "./application/AuctionService";
import type { CreateAuctionInput } from "./application/AuctionService";
import { io, Socket } from "socket.io-client";
import { TransactionHistory } from "./components/TransactionHistory";

const API_BASE = "http://localhost:3000/api";
const ITEMS_BASE = "http://localhost:3000/api";

export const App: React.FC = () => {
  const [auctions, setAuctions] = useState<AuctionDTO[]>([]);
  const [selected, setSelected] = useState<AuctionDTO | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [purchasedHistory, setPurchasedHistory] = useState<AuctionDTO[]>([]);
  const [soldHistory, setSoldHistory] = useState<AuctionDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const apiClient = useMemo(() => token ? new AuctionApiClient(API_BASE, token) : null, [token]);
  const auctionService = useMemo(() => apiClient ? new AuctionService(apiClient) : null, [apiClient]);
  const [activeMenu, setActiveMenu] = useState<"BUY" | "SELL" | "HISTORY">("BUY");

  // Cargar token y userId
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUserId = localStorage.getItem("userId");
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(Number(savedUserId));
    }
  }, []);

  // Fetch inicial del historial
  useEffect(() => {
    if (!auctionService || !userId) return;
    fetchHistory();
  }, [auctionService, userId]);

  // Conexión socket y listeners
useEffect(() => {
  if (!token || !userId) return;
  const s: Socket = io("http://localhost:3000", { auth: { token } });

  s.on("connect", () => console.log("[SOCKET] connected:", s.id));
  s.on("disconnect", (reason) => console.log("[SOCKET] disconnected:", reason));
  s.onAny((event, ...args) => console.log("[SOCKET EVENT]", event, args));

  setSocket(s);

  // Nueva subasta
  s.on("NEW_AUCTION", (auction: AuctionDTO) => {
    setAuctions(prev => prev.some(a => a.id === auction.id) ? prev : [auction, ...prev]);
  });

  // Subasta actualizada (puja, edición, etc.)
  s.on("AUCTION_UPDATED", (partial: Partial<AuctionDTO> & { id: number }) => {
  setAuctions(prev => {
    return prev.map(a => a.id === partial.id ? { ...a, ...partial } : a);
  });
  setSelected(prev => prev?.id === partial.id ? { ...prev!, ...partial } : prev);
  // Actualiza historial si es necesario
  const updatedAuction = auctions.find(a => a.id === partial.id);
  if (updatedAuction) updateHistory({ ...updatedAuction, ...partial }, userId!);
});

s.on("NEW_AUCTION", (auction: AuctionDTO) => {
  setAuctions(prev => prev.some(a => a.id === auction.id) ? prev : [auction, ...prev]);
});


  // Subasta cerrada o compra rápida
  s.on("AUCTION_CLOSED", ({ closedAuction }: { closedAuction: AuctionDTO }) => {
  // Actualiza historial
  updateHistory(closedAuction, userId!);

  // Actualiza lista de subastas eliminando la cerrada
  setAuctions(prev => prev.filter(a => a.id !== closedAuction.id));

  // Si la subasta cerrada estaba seleccionada, limpia selección
  setSelected(prev => (prev?.id === closedAuction.id ? null : prev));

  // Refresca items disponibles
  fetchItems();
});


  // Historial de transacciones
  s.on("TRANSACTION_CREATED", (auction: AuctionDTO) => {
    updateHistory(auction, userId!);
    fetchItems(); // refresca items disponibles
  });

  // Fetch inicial
  fetchAuctions();
  fetchItems();

  return () => {
    s.off("NEW_AUCTION");
    s.off("AUCTION_UPDATED");
    s.off("AUCTION_CLOSED");
    s.off("TRANSACTION_CREATED");
    s.offAny();
    s.disconnect();
  };
}, [token, userId]);

// Mantener selectedItemId sincronizado con items disponibles
useEffect(() => {
  const available = items.filter(i => i.isAvailable);
  if (!available.length) {
    setSelectedItemId(null);
  } else if (!available.some(i => i.id === selectedItemId)) {
    setSelectedItemId(available[0].id);
  }
}, [items]);


  // Mantener 'selected' sincronizado con 'auctions'
  useEffect(() => {
    if (!selected) return;
    const updated = auctions.find(a => a.id === selected.id);
    if (updated && updated !== selected) setSelected(updated);
  }, [auctions, selected]);

  // Reset historial si no hay token
  useEffect(() => {
    if (!token) {
      setPurchasedHistory([]);
      setSoldHistory([]);
    }
  }, [token]);

  // Mantener seleccionado en VENDER sincronizado con items disponibles
  const availableItems = useMemo(() => items.filter(item => item.isAvailable), [items]);
  useEffect(() => {
    if (!availableItems.length) {
      setSelectedItemId(null);
    } else if (selectedItemId === null || !availableItems.find(i => i.id === selectedItemId)) {
      setSelectedItemId(availableItems[0].id);
    }
  }, [availableItems]);

  // Filtros para Comprar
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      const matchName = filterName.length >= 4 ? a.title.toLowerCase().includes(filterName.toLowerCase()) : true;
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const matchType = filterType ? normalize(a.item?.type || "") === normalize(filterType) : true;
      const totalHours = (new Date(a.endsAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
      const matchDuration = filterDuration ? Math.round(totalHours) === filterDuration : true;
      const matchPrice = filterMaxPrice ? a.currentPrice <= filterMaxPrice : true;
      return matchName && matchType && matchDuration && matchPrice;
    });
  }, [auctions, filterName, filterType, filterDuration, filterMaxPrice]);

  // Fetchers
  const fetchAuctions = async () => {
    if (!auctionService) return;
    try { const data = await auctionService.listAuctions(); setAuctions(data); } catch (err) { console.error(err); }
  };

  const fetchItems = async () => {
  if (!token || !userId) return;
  try {
    const res = await fetch(`${ITEMS_BASE}/items?userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(res.statusText);
    const data: Item[] = await res.json();
    setItems(data);

    // Actualizar selectedItemId inmediatamente
    const available = data.filter(i => i.isAvailable);
    if (!available.length) {
      setSelectedItemId(null);
    } else if (!available.find(i => i.id === selectedItemId)) {
      setSelectedItemId(available[0].id);
    }

  } catch (err) {
    console.error(err);
    setItems([]);
    setSelectedItemId(null);
  }
};


  const fetchHistory = async () => {
    if (!auctionService || !userId) return;
    setLoadingHistory(true);
    try {
      const purchased = await auctionService.getPurchasedAuctions(userId);
      const sold = await auctionService.getSoldAuctions(userId);
      setPurchasedHistory(purchased.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()));
      setSoldHistory(sold.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()));
    } catch (err) { console.error("Error fetching history:", err); } finally { setLoadingHistory(false); }
  };

  // Acciones
  const handleBid = async (id: number) => {
    const amountStr = prompt("Ingrese monto de la puja:");
    if (!amountStr) return;
    const amount = Number(amountStr);
    try { await auctionService!.placeBid(id, amount); } catch (err) { console.error("[ERROR] handleBid:", err); }
  };

  const handleBuyNow = async (id: number) => {
    if (!auctionService) return alert("Servicio no disponible");
    try {
      const updated = await auctionService.getAuction(id);
      if (updated) {
        setAuctions(prev => prev.map(a => a.id === id ? updated : a));
        setSelected(prev => prev?.id === id ? updated : prev);
        updateHistory(updated, userId!);
      }
      await auctionService.buyNow(id);
    } catch (err) { console.error(err); }
  };

  const handleCreate = (input: Omit<CreateAuctionInput, "itemId">) => {
    if (!socket || !selectedItemId) return alert("No hay socket o item seleccionado");
    const data = { ...input, itemId: selectedItemId, token };
    socket.emit("CREATE_AUCTION", data);
  };

  const updateHistory = (auction: AuctionDTO, userId: number) => {
    setPurchasedHistory(prev => {
      const isBuyer = auction.highestBidderId === userId;
      if (!isBuyer) return prev;
      const exists = prev.some(a => a.id === auction.id);
      return exists ? prev.map(a => a.id === auction.id ? { ...a, ...auction } : a) : [auction, ...prev];
    });

    setSoldHistory(prev => {
      if (auction.item?.userId !== userId) return prev;
      const exists = prev.some(a => a.id === auction.id);
      return exists ? prev.map(a => a.id === auction.id ? { ...a, ...auction } : a) : [auction, ...prev];
    });
  };

  const uniqueTypes = Array.from(new Set(items.map(i => i.type)));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subastas</h1>

      {/* Menú de opciones */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveMenu("BUY")} className={`p-2 rounded ${activeMenu === "BUY" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Comprar</button>
        <button onClick={() => setActiveMenu("SELL")} className={`p-2 rounded ${activeMenu === "SELL" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Vender</button>
        <button onClick={() => setActiveMenu("HISTORY")} className={`p-2 rounded ${activeMenu === "HISTORY" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Recoger</button>
      </div>

      {/* Comprar */}
      {activeMenu === "BUY" && (
        <>
          <div className="mb-4 p-2 border rounded">
            <input placeholder="Nombre (mín 4 caracteres)" value={filterName} onChange={e => setFilterName(e.target.value)} className="border p-1 mr-2" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-1 mr-2">
              <option value="">Todos los tipos</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDuration ?? ""} onChange={e => setFilterDuration(e.target.value ? Number(e.target.value) : null)} className="border p-1 mr-2">
              <option value="">Todas las duraciones</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
            </select>
            <input type="number" placeholder="Precio máximo" value={filterMaxPrice ?? ""} onChange={e => setFilterMaxPrice(Number(e.target.value) || null)} className="border p-1 mr-2" />
          </div>

          <AuctionList auctions={filteredAuctions} onBid={handleBid} onBuyNow={handleBuyNow} onViewDetails={setSelected} />
          {selected && <AuctionDetails auction={selected} token={token || ""} onClose={() => setSelected(null)} />}
        </>
      )}

      {/* Vender */}
      {activeMenu === "SELL" && (
        <>
          <div className="mb-4">
            <label>Selecciona un item: </label>
            <select value={selectedItemId ?? undefined} onChange={e => setSelectedItemId(Number(e.target.value))}>
              {availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <CreateAuctionForm onCreate={handleCreate} />
        </>
      )}

      {/* Recoger / Historial */}
      {activeMenu === "HISTORY" && userId && token && (
        <TransactionHistory userId={userId} token={token} socket={socket} purchased={purchasedHistory} sold={soldHistory} />
      )}
    </div>
  );
};










