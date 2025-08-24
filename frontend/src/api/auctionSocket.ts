// src/api/auctionSocket.ts
import { io, Socket } from "socket.io-client";
import type { AuctionDTO, BidDTO } from "../domain/Auction";

let socket: Socket | null = null;

export const connectAuctionSocket = () => {
  if (!socket) {
    socket = io("http://localhost:3000"); // URL del backend de auctions
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
