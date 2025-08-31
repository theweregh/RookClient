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
  
  // Cargar token y userId
  useEffect(() => {
  if (!auctionService) {
    console.log("[DEBUG] auctionService NO está disponible");
  } else {
    console.log("[DEBUG] auctionService disponible:", auctionService);
    if (typeof auctionService.getPurchasedAuctions !== "function") {
      console.log("[DEBUG] getPurchasedAuctions NO es función");
    }
    if (typeof auctionService.getSoldAuctions !== "function") {
      console.log("[DEBUG] getSoldAuctions NO es función");
    }
  }
}, [auctionService]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUserId = localStorage.getItem("userId");
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(Number(savedUserId));
    }
  }, []);
  useEffect(() => {
  if (!auctionService || !userId) return;
  fetchHistory();
}, [auctionService, userId]);


  // Conexión socket y listeners
  // client/src/App.tsx
// ... (imports y estados)

// Conexión socket y listeners
useEffect(() => {
    if (!token || !userId) return;
    const s: Socket = io("http://localhost:3000", { auth: { token } });
    
    s.on("connect", () => console.log("[SOCKET] connected:", s.id));
    s.on("disconnect", (reason) => console.log("[SOCKET] disconnected:", reason));
    s.onAny((event, ...args) => console.log("[SOCKET EVENT]", event, args));

    setSocket(s);

    // Listeners de subastas
    s.on("NEW_AUCTION", (auction: AuctionDTO) => {
        setAuctions(prev => prev.some(a => a.id === auction.id) ? prev : [auction, ...prev]);
    });

    s.on("AUCTION_UPDATED", (partial: Partial<AuctionDTO> & { id: number }) => {
  setAuctions(prev => {
    // Creamos la versión actualizada de la subasta
    const updatedAuctions = prev.map(a => a.id === partial.id ? { ...a, ...partial } : a);

    // Buscamos la subasta actualizada dentro del mismo array
    const updatedAuction = updatedAuctions.find(a => a.id === partial.id);
    if (updatedAuction) {
      // Actualizamos el historial con la versión más reciente
      updateHistory(updatedAuction, userId!);
    }

    return updatedAuctions;
  });

  // Actualizamos el seleccionado
  setSelected(prev => prev?.id === partial.id ? { ...prev, ...partial } : prev);
});





    
    s.on("AUCTION_CLOSED", (auction: AuctionDTO) => {
        console.log("[SOCKET] AUCTION_CLOSED: refrescando lista de subastas y de items...");
        fetchAuctions();
        fetchItems(); // También actualiza la lista de ítems al cerrar una subasta
        updateHistory(auction, userId!);
    });

    // ⚡ AÑADE ESTE LISTENER DE VUELTA
    
s.on("TRANSACTION_CREATED", (auction: AuctionDTO) => {
    console.log("[SOCKET] TRANSACTION_CREATED:", auction);
    fetchItems();
    updateHistory(auction, userId!);
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
  // 🔹 Mantener 'selected' sincronizado con 'auctions'
useEffect(() => {
  if (!selected) return;
  const updated = auctions.find(a => a.id === selected.id);
  if (updated && updated !== selected) {
    setSelected(updated);
  }
}, [auctions, selected]);
  useEffect(() => {
  if (!token) {
    setPurchasedHistory([]);
    setSoldHistory([]);
  }
}, [token]);
  // Fetch inicial de subastas
  const fetchAuctions = async () => {
    if (!auctionService) return;
    try {
      const data = await auctionService.listAuctions();
      setAuctions(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch inicial de items
  const fetchItems = async () => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`${ITEMS_BASE}/items?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.statusText);
      const data: Item[] = await res.json();
      setItems(data);
      // Esto es clave: si el ítem seleccionado ya no está disponible,
      // seleccionamos el primero disponible o no seleccionamos ninguno
      const firstAvailable = data.find(i => i.isAvailable);
      if (!firstAvailable) {
        setSelectedItemId(null);
      } else if (selectedItemId === null || !data.find(i => i.id === selectedItemId)) {
        setSelectedItemId(firstAvailable.id);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setSelectedItemId(null);
    }
  };
  // ⚡ Aquí es donde filtramos la lista para solo mostrar los disponibles
  const availableItems = useMemo(() => {
    return items.filter(item => item.isAvailable);
  }, [items]);
  // Filtros
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      const matchName = filterName.length >= 4
        ? a.title.toLowerCase().includes(filterName.toLowerCase())
        : true;
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const matchType = filterType ? normalize(a.item?.type || "") === normalize(filterType) : true;
      const totalHours = (new Date(a.endsAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
      const matchDuration = filterDuration ? Math.round(totalHours) === filterDuration : true;
      const matchPrice = filterMaxPrice ? a.currentPrice <= filterMaxPrice : true;
      return matchName && matchType && matchDuration && matchPrice;
    });
  }, [auctions, filterName, filterType, filterDuration, filterMaxPrice]);
const fetchHistory = async () => {
  if (!auctionService || !userId) return; // ❌ importante: chequeo
  setLoadingHistory(true);
  try {
    const purchased = await auctionService.getPurchasedAuctions(userId);
    const sold = await auctionService.getSoldAuctions(userId);

    setPurchasedHistory(
      purchased.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
    );
    setSoldHistory(
      sold.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
    );
  } catch (err) {
    console.error("Error fetching history:", err);
  } finally {
    setLoadingHistory(false);
  }
};



  // Acciones de puja, compra y creación
const handleBid = async (id: number) => {
  const amountStr = prompt("Ingrese monto de la puja:");
  if (!amountStr) return;
  const amount = Number(amountStr);

  try {
    // Solo hacemos la puja, no necesitamos getAuction
    await auctionService!.placeBid(id, amount);

    // El socket AUCTION_UPDATED se encargará de actualizar la UI y el historial
  } catch (err) {
    console.error("[ERROR] handleBid:", err);
  }
};


 const updateHistory = (auction: AuctionDTO, userId: number) => {
  setPurchasedHistory(prev =>
    auction.highestBidderId === userId
      ? prev.some(a => a.id === auction.id)
        ? prev.map(a => a.id === auction.id ? { ...a, ...auction } : a)
        : [auction, ...prev]
      : prev
  );

  setSoldHistory(prev =>
    auction.item?.userId === userId
      ? prev.some(a => a.id === auction.id)
        ? prev.map(a => a.id === auction.id ? { ...a, ...auction } : a)
        : [auction, ...prev]
      : prev
  );
};








  const handleBuyNow = async (id: number) => {
  if (!auctionService) return alert("Servicio no disponible");
  try {
    const updated = await auctionService.getAuction(id);
    if (updated) {
  setAuctions(prev => prev.map(a => a.id === id ? updated : a));
  setSelected(prev => prev?.id === id ? updated : prev);
  // 🔹 Actualizamos historial solo con ese auction
  updateHistory(updated, userId!);}

    await auctionService.buyNow(id);
  } catch (err) {
    console.error(err);
  }
};


  const handleCreate = (input: Omit<CreateAuctionInput, "itemId">) => {
    if (!socket || !selectedItemId) return alert("No hay socket o item seleccionado");
    const data = { ...input, itemId: selectedItemId, token };
    socket.emit("CREATE_AUCTION", data);
  };
  
  const uniqueTypes = Array.from(new Set(items.map(i => i.type)));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subastas Activas</h1>

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

      <div className="mb-4">
        <label>Selecciona un item: </label>
        <select
          value={selectedItemId ?? undefined}
          onChange={e => setSelectedItemId(Number(e.target.value))}
        >
          {/* ⚡ Cambiamos `items` por `availableItems` aquí */}
          {availableItems.map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      <CreateAuctionForm onCreate={handleCreate} />
      {userId && token && <TransactionHistory 
    userId={userId} 
    token={token} 
    socket={socket} 
    purchased={purchasedHistory} 
    sold={soldHistory} 
/>
}
      <AuctionList auctions={filteredAuctions} onBid={handleBid} onBuyNow={handleBuyNow} onViewDetails={setSelected} />
      {selected && <AuctionDetails auction={selected} token={token || ""} onClose={() => setSelected(null)} />}
    </div>
  );
};










