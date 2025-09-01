export const env = { 
  apiBase: import.meta.env.VITE_API_BASE ?? "http://localhost:3000/api",
  itemsBase: import.meta.env.VITE_ITEMS_BASE ?? "http://localhost:3000/api",
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3000",
};
