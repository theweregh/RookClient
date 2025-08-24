// src/api/ItemsApi.ts (cliente)
export interface Item {
  id: number;
  userId: number;
  name: string;
  description: string;
}

const BASE_URL = "http://localhost:3002/items"; // apuntar al server de inventario real

export async function fetchItems(userId: number = 1): Promise<Item[]> {
  const res = await fetch(`${BASE_URL}?userId=${userId}`);
  if (!res.ok) throw new Error("Error al obtener items");
  return res.json();
}


export async function fetchItemById(id: number): Promise<Item> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error("Item no encontrado");
  return res.json();
}
