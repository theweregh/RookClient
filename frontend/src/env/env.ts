interface Env {
  api: {
    base: string;
    items: string;
  };
  socket: {
    base: string;
  };
}

export const env: Env = {
  api: {
    base: import.meta.env["VITE_API_BASE"] || "http://localhost:3000/api",
    items: import.meta.env["VITE_ITEMS_BASE"] || "http://localhost:3000/api",
  },
  socket: {
    base: import.meta.env["VITE_SOCKET_BASE"] || "http://localhost:3000",
  },
};
