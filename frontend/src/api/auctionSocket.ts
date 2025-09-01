// src/api/auctionSocket.ts
import { io, Socket } from "socket.io-client";
import type { BidDTO } from "../domain/Auction";
import { env } from "../env/env"; // 👈 importamos el archivo env.ts

let socket: Socket | null = null;

export const connectAuctionSocket = () => {
  if (!socket) {
    socket = io(env.socketUrl); // 👈 usamos la variable del .env
  }
  return socket;
};

export const onBuyNow = (
  callback: (data: {
    id: number;
    status: string;
    highestBid?: BidDTO;
    buyNowPrice: number;
  }) => void
) => {
  socket?.on("buyNow", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
