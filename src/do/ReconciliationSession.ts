/// <reference types="@cloudflare/workers-types" />

export class ReconciliationSession implements DurableObject {
  constructor(private state: DurableObjectState, _env: any) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/start") {
      const data = await request.json() as any;
      await this.state.storage.put("bankAccountId", data.bankAccountId);
      await this.state.storage.put("companyId", data.companyId);
      await this.state.storage.put("startTime", new Date().toISOString());
      await this.state.storage.put("lockedTransactions", []);
      return new Response(JSON.stringify({ success: true, message: "Session started" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/state") {
      const bankAccountId = await this.state.storage.get("bankAccountId");
      const companyId = await this.state.storage.get("companyId");
      const startTime = await this.state.storage.get("startTime");
      const lockedTransactions = await this.state.storage.get<string[]>("lockedTransactions") || [];
      return new Response(JSON.stringify({ bankAccountId, companyId, startTime, lockedTransactions }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/lock") {
      const { transactionId } = await request.json() as any;
      if (!transactionId) {
        return new Response("Missing transactionId", { status: 400 });
      }
      let locked = await this.state.storage.get<string[]>("lockedTransactions") || [];
      if (locked.includes(transactionId)) {
        return new Response(JSON.stringify({ success: false, reason: "Already locked" }), {
          headers: { "Content-Type": "application/json" },
          status: 409
        });
      }
      locked.push(transactionId);
      await this.state.storage.put("lockedTransactions", locked);
      // Broadcast update to WebSockets
      this.broadcast({ type: "LOCKED", transactionId });
      return new Response(JSON.stringify({ success: true, lockedTransactions: locked }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/unlock") {
      const { transactionId } = await request.json() as any;
      if (!transactionId) {
        return new Response("Missing transactionId", { status: 400 });
      }
      let locked = await this.state.storage.get<string[]>("lockedTransactions") || [];
      locked = locked.filter(id => id !== transactionId);
      await this.state.storage.put("lockedTransactions", locked);
      // Broadcast update to WebSockets
      this.broadcast({ type: "UNLOCKED", transactionId });
      return new Response(JSON.stringify({ success: true, lockedTransactions: locked }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (path === "/end") {
      await this.state.storage.deleteAll();
      return new Response(JSON.stringify({ success: true, message: "Session ended" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  private broadcast(message: any) {
    const sockets = this.state.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(JSON.stringify(message));
      } catch (err) {
        // Safe to ignore or close
      }
    }
  }

  private async handleWebSocket(ws: WebSocket) {
    this.state.acceptWebSocket(ws);
    // Send initial state to the newly connected client
    const lockedTransactions = await this.state.storage.get<string[]>("lockedTransactions") || [];
    ws.send(JSON.stringify({ type: "INIT", lockedTransactions }));
  }
}
