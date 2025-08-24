// src/components/ItemList.tsx
import React, { useEffect, useState } from "react";
import { fetchItems } from "../api/ItemsApi";
import type { Item } from "../api/ItemsApi";


export const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // Cargar items al inicio
    fetchItems().then(setItems).catch(console.error);

    // Conectar WebSocket
    const socket = new WebSocket("ws://localhost:3000");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ITEM_UPDATED") {
        setItems((prev) =>
          prev.map((i) => (i.id === data.item.id ? data.item : i))
        );
      } else if (data.type === "ITEM_CREATED") {
        setItems((prev) => [...prev, data.item]);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div>
      <h2>Lista de Items</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>: {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
};
