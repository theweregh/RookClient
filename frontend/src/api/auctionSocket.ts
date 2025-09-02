// src/api/auctionSocket.ts
import { io, Socket } from "socket.io-client";
import type { AuctionDTO, BidDTO } from "../domain/Auction";

let socket: Socket | null = null;

// Usamos variable de entorno de Vite
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const connectAuctionSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL);
  }
  return socket;
};

export const onBuyNow = (callback: (data: { id: number; status: string; highestBid?: BidDTO; buyNowPrice: number }) => void) => {
  socket?.on("buyNow", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
