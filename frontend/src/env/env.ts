export const env = {
  api: {
    base: import.meta.env["VITE_API_BASE"] || "http://localhost:3000/api",
    items: import.meta.env["VITE_ITEMS_BASE"] || "http://localhost:3000/api",
  },

  socket: {
    base: import.meta.env["VITE_SOCKET_BASE"] || "http://localhost:3000",
  },
};
