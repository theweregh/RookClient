import type { Item } from "../domain/Item";
import { env } from "../env/env";

const BASE_URL = `${env.api.base}/items`; // tu Auction server

/**
 * Fetch items del usuario autenticado.
 * @param token JWT del usuario actual
 */
export async function fetchItems(token: string): Promise<Item[]> {
  const res = await fetch(`${BASE_URL}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al obtener items: ${res.status} ${text}`);
  }

  return res.json(); // devuelve con type, heroType, etc.
}

/**
 * Fetch un item por ID del usuario autenticado.
 * @param id ID del item
 * @param token JWT del usuario actual
 */
export async function fetchItemById(id: number, token: string): Promise<Item> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Item no encontrado: ${res.status} ${text}`);
  }

  return res.json();
}
