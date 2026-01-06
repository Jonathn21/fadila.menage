// src/lib/websocket.ts
import envConfig from "@/config/env";

export const createWebSocket = (path: string) => {
  const wsUrl = `${envConfig.websocket.url}${path}`;
  return new WebSocket(wsUrl);
};