import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { getJwtSecret, verifyAccessToken } from "../../config/token.js";
import { MessageSenderType, ConversationType, NotificationType } from "@prisma/client";

export interface AuthenticatedClient {
    ws: WebSocket;
    actorType: "ADMIN" | "SELLER" | "CUSTOMER";
    actorId: string;
    actorName: string;
    subscribedConversations: Set<string>;
    isAlive: boolean;
}

const clients = new Map<WebSocket, AuthenticatedClient>();

// Helper to authenticate token
async function authenticateToken(
    token: string,
    roleHint?: string
): Promise<{ actorType: "ADMIN" | "SELLER" | "CUSTOMER"; actorId: string; actorName: string } | null> {
    try {
        const secret = getJwtSecret();
        const customerSecret = process.env.JWT_SECRET_KEY || secret;

        // Try Admin
        if (!roleHint || roleHint === "admin") {
            try {
                let decoded: any;
                try {
                    decoded = verifyAccessToken(token);
                } catch {
                    decoded = jwt.verify(token, secret);
                }
                if (decoded && decoded.id) {
                    const admin = await prisma.admin.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, firstName: true, lastName: true, isActive: true }
                    });
                    if (admin && admin.isActive) {
                        return {
                            actorType: "ADMIN",
                            actorId: admin.id,
                            actorName: `${admin.firstName || "Admin"} ${admin.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not admin, try next
            }
        }

        // Try Seller
        if (!roleHint || roleHint === "seller") {
            try {
                let decoded: any;
                try {
                    decoded = verifyAccessToken(token);
                } catch {
                    decoded = jwt.verify(token, secret);
                }
                if (decoded && (decoded.id || decoded.sellerId)) {
                    const sellerId = decoded.id || decoded.sellerId;
                    const seller = await prisma.seller.findUnique({
                        where: { id: sellerId },
                        select: { id: true, firstName: true, lastName: true, shop: { select: { name: true } } }
                    });
                    if (seller) {
                        return {
                            actorType: "SELLER",
                            actorId: seller.id,
                            actorName: seller.shop?.name || `${seller.firstName || "Seller"} ${seller.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not seller, try next
            }
        }

        // Try Customer
        if (!roleHint || roleHint === "customer") {
            try {
                const decoded: any = jwt.verify(token, customerSecret);
                if (decoded && decoded.id) {
                    const customer = await prisma.customer.findUnique({
                        where: { id: decoded.id },
                        select: { id: true, firstName: true, lastName: true, isBanned: true }
                    });
                    if (customer && !customer.isBanned) {
                        return {
                            actorType: "CUSTOMER",
                            actorId: customer.id,
                            actorName: `${customer.firstName || "Customer"} ${customer.lastName || ""}`.trim()
                        };
                    }
                }
            } catch {
                // Not customer
            }
        }

        return null;
    } catch (err) {
        return null;
    }
}

function extractCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

let wssInstance: WebSocketServer | null = null;

export function setupChatWebSocketServer(httpServer: HttpServer) {
    if (wssInstance) return wssInstance;

    const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });
    wssInstance = wss;

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const client = clients.get(ws);
            if (!client || !client.isAlive) {
                clients.delete(ws);
                return ws.terminate();
            }
            client.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(pingInterval);
    });

    wss.on("connection", async (ws: WebSocket, req) => {
        const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
        let token = url.searchParams.get("token");
        const role = url.searchParams.get("role") || undefined;

        // Auto-extract token from cookies if not in searchParams
        if (!token && req.headers.cookie) {
            if (role === "customer") {
                token = extractCookie(req.headers.cookie, "customer_session") || extractCookie(req.headers.cookie, "customer_token");
            } else if (role === "seller") {
                token = extractCookie(req.headers.cookie, "seller_session") || extractCookie(req.headers.cookie, "seller_access_token");
            } else if (role === "admin") {
                token = extractCookie(req.headers.cookie, "admin_session") || extractCookie(req.headers.cookie, "admin_access_token");
            }

            if (!token) {
                token = extractCookie(req.headers.cookie, "customer_session") ||
                        extractCookie(req.headers.cookie, "seller_session") ||
                        extractCookie(req.headers.cookie, "admin_session") ||
                        extractCookie(req.headers.cookie, "accessToken") ||
                        extractCookie(req.headers.cookie, "token");
            }
        }

        // Auto-extract from Authorization header
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        let authData: { actorType: "ADMIN" | "SELLER" | "CUSTOMER"; actorId: string; actorName: string } | null = null;

        if (token) {
            authData = await authenticateToken(token, role);
        }

        const client: AuthenticatedClient = {
            ws,
            actorType: authData?.actorType || (role === "admin" ? "ADMIN" : role === "seller" ? "SELLER" : "CUSTOMER"),
            actorId: authData?.actorId || "",
            actorName: authData?.actorName || "",
            subscribedConversations: new Set(),
            isAlive: true
        };

        clients.set(ws, client);

        ws.on("pong", () => {
            client.isAlive = true;
        });

        if (authData) {
            ws.send(JSON.stringify({
                type: "auth_success",
                actorType: client.actorType,
                actorId: client.actorId,
                actorName: client.actorName
            }));
        } else {
            ws.send(JSON.stringify({
                type: "auth_required",
                message: "Please send { type: 'auth', token: '...', role: '...' }"
            }));
        }

        ws.on("message", async (data) => {
            try {
                const messageStr = data.toString();
                const payload = JSON.parse(messageStr);

                switch (payload.type) {
                    case "auth": {
                        const verified = await authenticateToken(payload.token, payload.role);
                        if (!verified) {
                            return ws.send(JSON.stringify({ type: "error", message: "Invalid authentication credentials" }));
                        }
                        client.actorType = verified.actorType;
                        client.actorId = verified.actorId;
                        client.actorName = verified.actorName;
                        return ws.send(JSON.stringify({
                            type: "auth_success",
                            actorType: client.actorType,
                            actorId: client.actorId,
                            actorName: client.actorName
                        }));
                    }

                    case "join": {
                        if (!client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
                        }
                        const conversationId = String(payload.conversationId);
                        const conv = await prisma.conversation.findUnique({
                            where: { id: conversationId },
                            select: { id: true, type: true, customerId: true, sellerId: true }
                        });
                        if (!conv) {
                            return ws.send(JSON.stringify({ type: "error", message: "Conversation not found" }));
                        }

                        // Check authorization
                        if (client.actorType === "CUSTOMER" && conv.customerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }
                        if (client.actorType === "SELLER" && conv.sellerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }

                        client.subscribedConversations.add(conversationId);
                        return ws.send(JSON.stringify({ type: "joined", conversationId }));
                    }

                    case "leave": {
                        const conversationId = String(payload.conversationId);
                        client.subscribedConversations.delete(conversationId);
                        return ws.send(JSON.stringify({ type: "left", conversationId }));
                    }

                    case "send_message": {
                        if (!client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
                        }
                        const { conversationId, message, attachments = [], clientMessageId, isInternal = false } = payload;
                        if (!conversationId || (!message && (!attachments || attachments.length === 0))) {
                            return ws.send(JSON.stringify({ type: "error", message: "Message content or attachment required" }));
                        }

                        const conv = await prisma.conversation.findUnique({
                            where: { id: conversationId }
                        });
                        if (!conv) {
                            return ws.send(JSON.stringify({ type: "error", message: "Conversation not found" }));
                        }

                        if (client.actorType === "CUSTOMER" && conv.customerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }
                        if (client.actorType === "SELLER" && conv.sellerId !== client.actorId) {
                            return ws.send(JSON.stringify({ type: "error", message: "Unauthorized for this conversation" }));
                        }

                        // Check duplicate clientMessageId
                        if (clientMessageId) {
                            const existing = await prisma.conversationMessage.findFirst({
                                where: { conversationId, clientMessageId }
                            });
                            if (existing) {
                                return ws.send(JSON.stringify({
                                    type: "message_ack",
                                    clientMessageId,
                                    message: existing
                                }));
                            }
                        }

                        // Sender Type
                        let senderType: MessageSenderType = MessageSenderType.CUSTOMER;
                        if (client.actorType === "ADMIN") senderType = MessageSenderType.ADMIN;
                        else if (client.actorType === "SELLER") senderType = MessageSenderType.SELLER;

                        // Non-admin cannot create internal messages
                        const safeIsInternal = client.actorType === "ADMIN" ? Boolean(isInternal) : false;

                        const savedMessage = await prisma.$transaction(async (tx) => {
                            const msg = await tx.conversationMessage.create({
                                data: {
                                    conversationId,
                                    senderType,
                                    senderId: client.actorId,
                                    senderName: client.actorName,
                                    message: message ? message.trim() : "",
                                    attachments: Array.isArray(attachments) ? attachments : [],
                                    clientMessageId: clientMessageId || null,
                                    isInternal: safeIsInternal
                                }
                            });

                            await tx.conversation.update({
                                where: { id: conversationId },
                                data: {
                                    lastMessageAt: new Date(),
                                    status: conv.status === "RESOLVED" ? "OPEN" : conv.status
                                }
                            });

                            return msg;
                        });

                        // Broadcast message to subscribed clients
                        broadcastToConversation(conversationId, {
                            type: "new_message",
                            conversationId,
                            message: savedMessage
                        }, safeIsInternal);

                        // Ack to sender
                        return ws.send(JSON.stringify({
                            type: "message_ack",
                            clientMessageId: clientMessageId || null,
                            message: savedMessage
                        }));
                    }

                    case "read": {
                        if (!client.actorId) return;
                        const conversationId = String(payload.conversationId);
                        await prisma.conversationReadReceipt.upsert({
                            where: {
                                conversationId_readerType_readerId: {
                                    conversationId,
                                    readerType: client.actorType,
                                    readerId: client.actorId
                                }
                            },
                            update: { lastReadAt: new Date() },
                            create: {
                                conversationId,
                                readerType: client.actorType,
                                readerId: client.actorId,
                                lastReadAt: new Date()
                            }
                        });

                        broadcastToConversation(conversationId, {
                            type: "read_receipt",
                            conversationId,
                            readerType: client.actorType,
                            readerId: client.actorId,
                            readAt: new Date().toISOString()
                        });
                        break;
                    }

                    case "typing": {
                        const conversationId = String(payload.conversationId);
                        broadcastToConversation(conversationId, {
                            type: "typing",
                            conversationId,
                            actorType: client.actorType,
                            actorId: client.actorId,
                            actorName: client.actorName,
                            isTyping: Boolean(payload.isTyping)
                        }, false, ws);
                        break;
                    }
                }
            } catch (err: any) {
                console.error("[WS] message handling error:", err);
                ws.send(JSON.stringify({ type: "error", message: err.message || "Failed to process message" }));
            }
        });

        ws.on("close", () => {
            clients.delete(ws);
        });

        ws.on("error", (err) => {
            console.error("[WS] socket error:", err);
            clients.delete(ws);
        });
    });

    console.log("[WS] Chat WebSocket Server initialized on /ws/chat");
    return wss;
}

export function broadcastToConversation(
    conversationId: string,
    payload: any,
    isInternal: boolean = false,
    excludeWs?: WebSocket
) {
    const raw = JSON.stringify(payload);
    for (const [ws, client] of clients.entries()) {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            // Internal messages only go to ADMIN
            if (isInternal && client.actorType !== "ADMIN") continue;

            if (client.subscribedConversations.has(conversationId)) {
                ws.send(raw);
            }
        }
    }
}
