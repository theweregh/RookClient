// src/components/ItemList.tsx
import React, { useEffect, useState } from "react";
import { fetchItems } from "../api/ItemsApi";
import type { Item } from "../domain/Item";


export const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // Cargar items iniciales desde la API
    fetchItems().then(setItems);

    // Conectar al WebSocket
    const ws = new WebSocket("ws://localhost:3000");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "ITEM_CREATED") {
        setItems((prev) => [...prev, data.item]);
      } else if (data.type === "ITEM_UPDATED") {
        setItems((prev) =>
          prev.map((i) => (i.id === data.item.id ? data.item : i))
        );
      } else if (data.type === "ITEM_DELETED") {
        setItems((prev) => prev.filter((i) => i.id !== data.item.id));
      }
    };

    // Limpiar conexión al desmontar
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold">Items</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border p-2 rounded mb-2">
            <strong>{item.name}</strong>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};