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
import { env } from "./env/env";
const API_BASE = env.apiBase;
const ITEMS_BASE = env.itemsBase;

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
  const [_loadingHistory, setLoadingHistory] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"BUY" | "SELL" | "HISTORY" | "ACTIVE_BIDS">("BUY");
  const [activeBids, setActiveBids] = useState<AuctionDTO[]>([]);
  const apiClient = useMemo(() => token ? new AuctionApiClient(API_BASE, token) : null, [token]);
  const auctionService = useMemo(() => apiClient ? new AuctionService(apiClient) : null, [apiClient]);

  // Cargar token y userId
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUserId = localStorage.getItem("userId");
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(Number(savedUserId));
    }
  }, []);

  // Fetch historial
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

  // Fetch items
  const fetchItems = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`${ITEMS_BASE}/items?userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.statusText);
      const data: Item[] = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
      setItems([]);
      setSelectedItemId(null);
    }
  };

  // Actualizar una subasta
  const updateAuction = (partial: Partial<AuctionDTO> & { id: number }) => {
    setAuctions(prev => {
      let exists = false;
      const updated = prev.map(a => {
        if (a.id === partial.id) {
          exists = true;
          return {
            ...a,
            ...partial,
            bids: [
              ...(a.bids || []),
              ...(partial.bids || []).filter(b => !(a.bids || []).some(old => old.id === b.id))
            ]
          };
        }
        return a;
      });
      if (!exists) updated.unshift(partial as AuctionDTO);
      return updated;
    });
  };

  // Conexión socket y listeners
  useEffect(() => {
    if (!token || !userId) return;

    const fetchInitialData = async () => {
      if (!auctionService) return;
      try { const data = await auctionService.listAuctions(); setAuctions(data); } catch (err) { console.error(err); }
    };

    fetchInitialData();
    fetchItems();
    fetchHistory();

    const s: Socket = io(env.socketUrl, { auth: { token } });
    setSocket(s);

    s.on("connect", () => console.log("[SOCKET] connected:", s.id));
    s.on("disconnect", (reason) => console.log("[SOCKET] disconnected:", reason));

    s.on("NEW_AUCTION", (auction: AuctionDTO) => updateAuction(auction));
    s.on("AUCTION_UPDATED", (partial) => updateAuction(partial));
    s.on("TRANSACTION_CREATED", (auction: AuctionDTO) => updateAuction(auction));
    s.on("AUCTION_CLOSED", ({ closedAuction }: { closedAuction: AuctionDTO }) => {
      setAuctions(prev => prev.filter(a => a.id !== closedAuction.id));
      setSelected(prev => (prev?.id === closedAuction.id ? null : prev));
      fetchItems();
    });

    return () => { s.disconnect(); };
  }, [token, userId]);

  // Mantener activeBids sincronizado automáticamente
  useEffect(() => {
    if (!userId) return;
    const active = auctions.filter(a => (a.bids?.some(b => b.userId === userId) || a.highestBidderId === userId));
    setActiveBids(active);
  }, [auctions, userId]);

  // Lógica para VENDER
  const availableItems = useMemo(() => items.filter(i => i.isAvailable), [items]);
  useEffect(() => {
    if (!availableItems.length) setSelectedItemId(null);
    else if (selectedItemId === null || !availableItems.find(i => i.id === selectedItemId))
      setSelectedItemId(availableItems[0].id);
  }, [availableItems]);

  const isUserHighestBidder = (auction: AuctionDTO) => auction.highestBidderId === userId;

  // Filtros
  const [filterName, _setFilterName] = useState("");
  const [filterType, _setFilterType] = useState("");
  const [filterDuration, _setFilterDuration] = useState<number | null>(null);
  const [filterMaxPrice, _setFilterMaxPrice] = useState<number | null>(null);

  const filteredAuctions = useMemo(() => auctions.filter(a => {
    const matchName = filterName.length >= 4 ? a.title.toLowerCase().includes(filterName.toLowerCase()) : true;
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matchType = filterType ? normalize(a.item?.type || "") === normalize(filterType) : true;
    const totalHours = (new Date(a.endsAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
    const matchDuration = filterDuration ? Math.round(totalHours) === filterDuration : true;
    const matchPrice = filterMaxPrice ? a.currentPrice <= filterMaxPrice : true;
    return matchName && matchType && matchDuration && matchPrice;
  }), [auctions, filterName, filterType, filterDuration, filterMaxPrice]);

  // Acciones
  const handleBid = async (id: number, amount?: number) => {
    if (!amount) { const str = prompt("Ingrese monto de la puja:"); if (!str) return; amount = Number(str); }
    try { await auctionService!.placeBid(id, amount); } catch (err) { console.error(err); }
  };

  const handleBuyNow = async (id: number) => {
    if (!auctionService) return alert("Servicio no disponible");
    try {
      const updated = await auctionService.getAuction(id);
      if (updated) {
        setAuctions(prev => prev.map(a => a.id === id ? updated : a));
        setSelected(prev => prev?.id === id ? updated : prev);
      }
      await auctionService.buyNow(id);
    } catch (err) { console.error(err); }
  };

  const handleCreate = (input: Omit<CreateAuctionInput, "itemId">) => {
    if (!socket || !selectedItemId) return alert("No hay socket o item seleccionado");
    socket.emit("CREATE_AUCTION", { ...input, itemId: selectedItemId, token });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subastas</h1>
      {/* Botones menú */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveMenu("BUY")} className={`p-2 rounded ${activeMenu === "BUY" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Comprar</button>
        <button onClick={() => setActiveMenu("SELL")} className={`p-2 rounded ${activeMenu === "SELL" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Vender</button>
        <button onClick={() => setActiveMenu("HISTORY")} className={`p-2 rounded ${activeMenu === "HISTORY" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Recoger</button>
        <button onClick={() => setActiveMenu("ACTIVE_BIDS")} className={`p-2 rounded ${activeMenu === "ACTIVE_BIDS" ? "bg-blue-500 text-white" : "bg-gray-200"}`}>Mis Pujas</button>
      </div>
      {/* Render según menú */}
      {activeMenu === "BUY" && <AuctionList auctions={filteredAuctions} onBid={handleBid} onBuyNow={handleBuyNow} onViewDetails={setSelected} />}
      {activeMenu === "SELL" && <CreateAuctionForm onCreate={handleCreate} />}
      {activeMenu === "HISTORY" && userId && token && <TransactionHistory userId={userId} token={token} socket={socket} purchased={purchasedHistory} sold={soldHistory} />}
      {activeMenu === "ACTIVE_BIDS" && (
        <div className="p-2 border rounded">
          {activeBids.length === 0 ? <p>No tienes pujas activas.</p> : (
            <ul>{activeBids.map(a => (
              <li key={a.id} className="mb-2 p-2 border rounded">
                <div className="flex justify-between items-center">
                  <span>{a.title} - Actual: ${a.currentPrice}</span>
                  <span className={`font-bold ${isUserHighestBidder(a) ? "text-green-600" : "text-red-600"}`}>
                    {isUserHighestBidder(a) ? "¡Vas ganando!" : "Superado"}
                  </span>
                  <button onClick={() => setSelected(a)} className="ml-2 p-1 border rounded bg-gray-300">Ver detalles</button>
                </div>
              </li>
            ))}</ul>
          )}
        </div>
      )}
      {selected && <AuctionDetails auction={selected} token={token || ""} onClose={() => setSelected(null)} />}
    </div>
  );
};










