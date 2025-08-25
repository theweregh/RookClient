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
import {TransactionHistory} from "./components/TransactionHistory";
const API_BASE = "http://localhost:3000/api";
const ITEMS_BASE = "http://localhost:3000/api";
const LOGIN_URL = "http://localhost:4000/login";

export const App: React.FC = () => {
  console.log("Render App");

  // --- Estados principales ---
  const [auctions, setAuctions] = useState<AuctionDTO[]>([]);
  const [selected, setSelected] = useState<AuctionDTO | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // --- Login automático ---
  const login = async () => {
    console.log("Intentando login...");
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "John Doe", password: "1234" }),
      });
      const data = await res.json();
      console.log("Login response:", data);
      setToken(data.token);

      // Extraer userId del token (JWT)
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      setUserId(payload.userId);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  // --- Inicializar cliente y servicio con token ---
  const apiClient = useMemo(() => {
    if (!token) return null;
    console.log("Creando API client con token:", token);
    return new AuctionApiClient(API_BASE, token);
  }, [token]);

  const auctionService = useMemo(() => {
    if (!apiClient) return null;
    console.log("Creando AuctionService");
    return new AuctionService(apiClient);
  }, [apiClient]);

  // --- Fetch de subastas ---
  const fetchAuctions = async () => {
    if (!auctionService) return;
    console.log("Fetching auctions...");
    try {
      const data = await auctionService.listAuctions();
      console.log("Auctions fetched:", data);
      setAuctions(data);
    } catch (err) {
      console.error("Error fetching auctions:", err);
    }
  };

  // --- Fetch de items filtrando por usuario ---
  const fetchItems = async () => {
    if (!token || !userId) return;
    console.log("Fetching items for user:", userId);
    try {
      const res = await fetch(`${ITEMS_BASE}/items?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Items fetch response status:", res.status);
      if (!res.ok) throw new Error(res.statusText);
      const data: Item[] = await res.json();
      console.log("User items fetched:", data);
      setItems(data);
      setSelectedItemId(data.length > 0 ? data[0].id : null);
    } catch (err) {
      console.error("Error fetching items:", err);
      setItems([]);
      setSelectedItemId(null);
    }
  };

  // --- Efecto inicial ---
  useEffect(() => {
    login();
  }, []);

  useEffect(() => {
    if (!token || !userId) return;

    console.log("Token y userId disponibles:", token, userId);
    fetchAuctions();
    fetchItems();

    const s: Socket = io("http://localhost:3000", { auth: { token } });
    console.log("Socket created:", s.id);
    setSocket(s);

    s.onAny((event, ...args) => {
      console.log("[SOCKET EVENT]", event, args);
    });
    s.on("connect", () => console.log("[SOCKET] connected:", s.id));
    s.on("disconnect", (reason) => console.log("[SOCKET] disconnected:", reason));

    return () => {
      s.offAny();
      s.disconnect();
    };
  }, [token, userId]);

  // --- Filtros ---
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);

  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const matchName =
        filterName.length >= 4
          ? a.title.toLowerCase().includes(filterName.toLowerCase())
          : true;
      const normalize = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const matchType = filterType
        ? normalize(a.item?.type || "") === normalize(filterType)
        : true;
      const totalHours =
        (new Date(a.endsAt).getTime() - new Date(a.createdAt).getTime()) /
        (1000 * 60 * 60);
      const matchDuration = filterDuration
        ? Math.round(totalHours) === filterDuration
        : true;
      const matchPrice = filterMaxPrice ? a.currentPrice <= filterMaxPrice : true;
      return matchName && matchType && matchDuration && matchPrice;
    });
  }, [auctions, filterName, filterType, filterDuration, filterMaxPrice]);

  // --- Acciones ---
  const handleBid = async (id: number) => {
    if (!auctionService) return;
    const amountStr = prompt("Ingrese monto de la puja:");
    if (!amountStr) return;
    const amount = Number(amountStr);
    console.log("Intentando pujar:", { id, amount });
    try {
      const ok = await auctionService.placeBid(id, amount);
      console.log("Resultado puja:", ok);
      if (!ok) return alert("No se pudo realizar la puja. Verifica tus créditos.");
      await fetchAuctions();
      if (selected && selected.id === id) {
        const fresh = await auctionService.getAuction(id);
        setSelected(fresh);
      }
    } catch (err) {
      alert("Error al realizar la puja.");
      console.error(err);
    }
  };

  const handleBuyNow = async (id: number) => {
    if (!auctionService) return;
    console.log("Intentando compra rápida:", id);
    try {
      const ok = await auctionService.buyNow(id);
      console.log("Resultado BUY_NOW:", ok);
      if (!ok) return alert("No se pudo realizar la compra rápida.");
      await fetchAuctions();
      if (selected && selected.id === id) {
        const fresh = await auctionService.getAuction(id);
        setSelected(fresh);
      }
    } catch (err) {
      alert("Error en compra rápida.");
      console.error(err);
    }
  };

  const handleCreate = (input: Omit<CreateAuctionInput, "itemId">) => {
    if (!socket || !token) return alert("No hay socket o token");
    if (!selectedItemId) return alert("No hay item seleccionado");

    const data = { ...input, itemId: selectedItemId, token };
    console.log("Emit CREATE_AUCTION:", data);
    socket.emit("CREATE_AUCTION", data, (response: any) => {
      console.log("CREATE_AUCTION callback:", response);
      fetchAuctions();
    });
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
          onChange={(e) => setFilterType(e.target.value)}
          className="border p-1 mr-2"
        >
          <option value="">Todos los tipos</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={filterDuration ?? ""}
          onChange={(e) =>
            setFilterDuration(e.target.value ? Number(e.target.value) : null)
          }
          className="border p-1 mr-2"
        >
          <option value="">Todas las duraciones</option>
          <option value="24">24 horas</option>
          <option value="48">48 horas</option>
        </select>
        <input
          type="number"
          placeholder="Precio máximo"
          value={filterMaxPrice ?? ""}
          onChange={(e) =>
            setFilterMaxPrice(Number(e.target.value) || null)
          }
          className="border p-1 mr-2"
        />
      </div>

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
       {userId && token && <TransactionHistory userId={userId} token={token} />}   
      {/* Lista de subastas */}
      <AuctionList
        auctions={filteredAuctions}
        onBid={handleBid}
        onBuyNow={handleBuyNow}
        onViewDetails={setSelected}
      />

      {/* Modal de detalles */}
      {selected && (
        <AuctionDetails
          auction={selected}
          token={token || ""}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};











