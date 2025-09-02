// ItemList.tsx
import React, { useEffect, useState } from "react";
import type { Item } from "../domain/Item";
import { io, Socket } from "socket.io-client";
import { env } from "../env/env";

interface Props {
  socket: Socket | null;
  token: string | null;
}

export const ItemList: React.FC<Props> = ({ socket, token }) => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!token) return;

    // Fetch inicial con token
    fetch(`${env.api.items}/items`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleItemCreated = (item: Item) => setItems(prev => [...prev, item]);
    const handleItemUpdated = (item: Item) =>
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)));
    const handleItemDeleted = (itemId: number) =>
      setItems(prev => prev.filter(i => i.id !== itemId));

    socket.on("ITEM_CREATED", handleItemCreated);
    socket.on("ITEM_UPDATED", handleItemUpdated);
    socket.on("ITEM_DELETED", handleItemDeleted);

    return () => {
      socket.off("ITEM_CREATED", handleItemCreated);
      socket.off("ITEM_UPDATED", handleItemUpdated);
      socket.off("ITEM_DELETED", handleItemDeleted);
    };
  }, [socket]);

  return (
    <div>
      <h2 className="text-xl font-bold">Items</h2>
      <ul>
        {items.map(item => (
          <li key={item.id} className="border p-2 rounded mb-2">
            <strong>{item.name}</strong>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
