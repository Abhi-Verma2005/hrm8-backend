/**
 * WebSocket Server
 * Handles real-time messaging between recruiters and applicants
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { authenticateWebSocket } from './utils/websocketAuth';
import { ConversationService } from './services/messaging/ConversationService';
import { ParticipantType } from '@prisma/client';
import { ClientConnection, WSMessage } from './types';

// Connection management
const connections = new Map<string, ClientConnection>();
const conversationRooms = new Map<string, Set<string>>();

const buildConnectionKey = (userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8', userId: string) =>
  `${userType}:${userId}`;

const resolveParticipantType = (userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8'): ParticipantType => {
  switch (userType) {
    case 'USER':
      return ParticipantType.EMPLOYER;
    case 'CANDIDATE':
      return ParticipantType.CANDIDATE;
    case 'CONSULTANT':
      return ParticipantType.CONSULTANT;
    case 'HRM8':
      return ParticipantType.SYSTEM;
    default:
      return ParticipantType.CANDIDATE;
  }
};

const describeConnectionKey = (connectionKey: string) => {
  const connection = connections.get(connectionKey);
  return connection ? `${connection.userEmail} (${connectionKey})` : connectionKey;
};

const logRoomState = (conversationId?: string) => {
  // Silent in production
};

/**
 * Transform Prisma message object to frontend camelCase format
 */
const transformMessageForFrontend = (msg: any, currentUserId?: string) => ({
  id: msg.id,
  conversationId: msg.conversation_id,
  senderEmail: msg.sender_email,
  senderType: msg.sender_type,
  senderId: msg.sender_id,
  content: msg.content,
  contentType: msg.content_type,
  readBy: msg.read_by || [],
  deliveredAt: msg.delivered_at,
  readAt: msg.read_at,
  createdAt: msg.created_at,
  updatedAt: msg.updated_at,
  isOwn: currentUserId ? msg.sender_id === currentUserId : false,
  attachments: msg.attachments?.map((a: any) => ({
    id: a.id,
    fileName: a.file_name,
    fileUrl: a.file_url,
    mimeType: a.mime_type,
    size: a.size,
  })) || [],
});

// WebSocket Server - will be attached to main server
const wss = new WebSocketServer({ noServer: true });

// Utility functions

/**
 * Enhanced broadcast function with switch for global/room broadcasting
 */
const broadcast = (
  message: any,
  options: {
    type: 'room' | 'global' | 'users';
    conversationId?: string;
    excludeConnectionKey?: string;
    targetConnectionKeys?: string[];
  }
) => {
  const { type, conversationId, excludeConnectionKey, targetConnectionKeys } = options;

  let targetKeys: string[] = [];

  switch (type) {
    case 'room':
      if (!conversationId) {
        return;
      }
      const room = conversationRooms.get(conversationId);
      if (!room) {
        return;
      }
      targetKeys = Array.from(room);
      break;

    case 'global':
      targetKeys = Array.from(connections.keys());
      break;

    case 'users':
      if (!targetConnectionKeys || targetConnectionKeys.length === 0) {
        return;
      }
      targetKeys = targetConnectionKeys;
      break;

    default:
      return;
  }

  // Filter out excluded user
  if (excludeConnectionKey) {
    targetKeys = targetKeys.filter((key) => key !== excludeConnectionKey);
  }

  // Send message to all target users
  targetKeys.forEach((connectionKey) => {
    const connection = connections.get(connectionKey);
    if (connection && connection.ws.readyState === 1) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send to ${describeConnectionKey(connectionKey)}:`, error);
      }
    }
  });
};

/**
 * Helper function for room broadcasting
 */
const broadcastToRoom = (
  conversationId: string,
  message: any,
  excludeConnectionKey?: string
) => {
  broadcast(message, {
    type: 'room',
    conversationId,
    excludeConnectionKey,
  });
};

/**
 * Helper function for global broadcasting
 */
const broadcastGlobal = (message: any, excludeConnectionKey?: string) => {
  broadcast(message, {
    type: 'global',
    excludeConnectionKey,
  });
};

/**
 * Add user to conversation room
 */
const addUserToRoom = (conversationId: string, connectionKey: string) => {
  if (!conversationRooms.has(conversationId)) {
    conversationRooms.set(conversationId, new Set());
  }
  conversationRooms.get(conversationId)!.add(connectionKey);
};

/**
 * Remove user from conversation room
 */
const removeUserFromRoom = (conversationId: string, connectionKey: string) => {
  const room = conversationRooms.get(conversationId);
  if (room) {
    room.delete(connectionKey);
    if (room.size === 0) {
      conversationRooms.delete(conversationId);
    }
  }
};

/**
 * Get conversation messages
 */
const getConversationMessages = async (conversationId: string) => {
  try {
    const messages = await ConversationService.listMessages(conversationId, 50);
    return messages;
  } catch (error) {
    console.error(
      `❌ Error fetching messages for conversation ${conversationId}:`,
      error
    );
    throw error;
  }
};

/**
 * Send error message to client
 */
const sendError = (ws: WebSocket, message: string, code = 4000) => {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message, code },
      })
    );
  }
};

// WebSocket connection handler
wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const ip = req.socket.remoteAddress;

  let currentConnection: ClientConnection | null = null;
  let isAuthenticated = false;
  let heartbeatInterval: NodeJS.Timeout;

  // Send initial connection success
  ws.send(
    JSON.stringify({
      type: 'connection_established',
      payload: { message: 'Connected to server. Please authenticate.' },
    })
  );

  // Heartbeat to keep connection alive
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.ping();
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Authenticate on connection using session cookies
  const authResult = await authenticateWebSocket(req);
  if (authResult) {
    const connectionKey = buildConnectionKey(authResult.userType, authResult.userId);
    currentConnection = {
      ws,
      userEmail: authResult.email,
      userName: authResult.name,
      userId: authResult.userId,
      userType: authResult.userType,
      connectionKey,
      authenticated: true,
    };

    connections.set(connectionKey, currentConnection);
    isAuthenticated = true;

    // Send authentication success
    try {
      if (ws.readyState === 1) {
        ws.send(
          JSON.stringify({
            type: 'authentication_success',
            payload: {
              userEmail: authResult.email,
              userName: authResult.name,
              userType: authResult.userType,
              message: 'Authentication successful',
            },
          })
        );
      }
    } catch (error) {
      console.error('❌ Error sending authentication success:', error);
    }

    // Send online users list
    try {
      if (ws.readyState === 1) {
        const currentOnlineUsers = Array.from(connections.values());
        const usersToSend = currentOnlineUsers.map((u) => ({
          userEmail: u.userEmail,
          userName: u.userName,
        }));

        ws.send(
          JSON.stringify({
            type: 'online_users_list',
            payload: {
              users: usersToSend,
            },
          })
        );
      }
    } catch (error) {
      console.error('❌ Error sending online users list:', error);
    }

    // Broadcast user online status
    try {
      broadcastGlobal(
        {
          type: 'user_online',
          payload: {
            userEmail: currentConnection.userEmail,
            userName: currentConnection.userName,
          },
        },
        currentConnection.connectionKey
      );
    } catch (error) {
      console.error('❌ Error broadcasting user online status:', error);
    }
  } else {
    sendError(ws, 'Authentication failed. Please login first.', 4001);
  }

  ws.on('message', (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      // Handle authentication first
      if (!isAuthenticated && message.type !== 'authenticate') {
        sendError(
          ws,
          'Authentication required. Please send authenticate message first.',
          4001
        );
        return;
      }

      switch (message.type) {
        case 'authenticate':
          // Already authenticated via cookies, but handle for compatibility
          if (isAuthenticated && currentConnection) {
            ws.send(
              JSON.stringify({
                type: 'authentication_success',
                payload: {
                  userEmail: currentConnection.userEmail,
                  userName: currentConnection.userName,
                  userType: currentConnection.userType,
                  message: 'Already authenticated',
                },
              })
            );
          } else {
            sendError(ws, 'Authentication failed', 4001);
          }
          break;

        case 'join_conversation':
          (async () => {
            const { conversationId } = message.payload;
            try {
              if (!currentConnection) {
                sendError(ws, 'Not authenticated', 4001);
                return;
              }

              // Fetch conversation from database
              const conversation = await ConversationService.getConversation(conversationId);

              if (!conversation) {
                sendError(ws, 'Conversation not found', 4004);
                return;
              }

              const isParticipant = conversation.participants.some(
                (p: any) => p.participant_id === currentConnection!.userId
              );

              if (!isParticipant) {
                sendError(ws, 'Access denied to this conversation', 4003);
                return;
              }

              // Leave previous room if any
              if (currentConnection.conversationId) {
                removeUserFromRoom(
                  currentConnection.conversationId,
                  currentConnection.connectionKey
                );
              }

              // Join new room
              currentConnection.conversationId = conversationId;
              addUserToRoom(conversationId, currentConnection.connectionKey);

              // Send recent messages
              const conversationMessages = await getConversationMessages(conversationId);

              ws.send(
                JSON.stringify({
                  type: 'messages_loaded',
                  payload: {
                    conversationId,
                    messages: conversationMessages.map((msg) =>
                      transformMessageForFrontend(msg, currentConnection!.userId)
                    ),
                  },
                })
              );

              await ConversationService.markMessagesAsRead(
                conversationId,
                currentConnection.userId
              );

              // Notify others in the room that user joined
              broadcastToRoom(
                conversationId,
                {
                  type: 'user_joined',
                  payload: {
                    userEmail: currentConnection.userEmail,
                  },
                },
                currentConnection.connectionKey
              );
            } catch (error) {
              console.error(
                `❌ Error joining conversation ${conversationId}:`,
                error
              );
              if (ws.readyState === 1) {
                try {
                  sendError(ws, 'Failed to join conversation', 4500);
                } catch (sendError) {
                  console.error('❌ Failed to send error message:', sendError);
                }
              }
            }
          })().catch((error) => {
            console.error('❌ Unhandled promise rejection in join_conversation:', error);
          });
          break;

        case 'send_message':
          (async () => {
            try {
              if (!currentConnection) {
                sendError(ws, 'Not authenticated', 4001);
                return;
              }

              const { conversationId: msgConvId, content } = message.payload;

              // Verify conversation exists and user has access
              const msgConversation = await ConversationService.getConversation(msgConvId);

              if (!msgConversation) {
                sendError(ws, 'Conversation not found', 4004);
                return;
              }

              const isParticipant = msgConversation.participants.some(
                (p: any) => p.participant_id === currentConnection!.userId
              );

              if (!isParticipant) {
                sendError(ws, 'Access denied to this conversation', 4003);
                return;
              }

              // ========== CANDIDATE REPLY RESTRICTION REMOVED ==========
              // Open conversation allowed as per user request
              // ========== END CANDIDATE RESTRICTION REMOVED ==========

              // Create message in database
              const newMessage = await ConversationService.createMessage({
                conversationId: msgConvId,
                senderEmail: currentConnection.userEmail,
                senderType: resolveParticipantType(currentConnection.userType),
                senderId: currentConnection.userId,
                content: content.trim(),
              });

              // Broadcast message to all participants in the conversation
              broadcastToRoom(
                msgConvId,
                {
                  type: 'new_message',
                  payload: transformMessageForFrontend(newMessage, undefined),
                },
                currentConnection.connectionKey
              );

              ws.send(
                JSON.stringify({
                  type: 'message_sent',
                  payload: transformMessageForFrontend(newMessage, currentConnection.userId),
                })
              );
            } catch (error) {
              console.error(
                `❌ Error sending message from ${currentConnection?.userEmail}:`,
                error
              );
              if (ws.readyState === 1) {
                try {
                  sendError(ws, 'Failed to send message', 4500);
                } catch (sendError) {
                  console.error('❌ Failed to send error message:', sendError);
                }
              }
            }
          })().catch((error) => {
            console.error('❌ Unhandled promise rejection in send_message:', error);
          });
          break;

        default:
          sendError(ws, `Unknown message type: ${message.type}`, 4006);
      }
    } catch (error) {
      console.error(
        `❌ Error processing message from ${currentConnection?.userEmail || ip}:`,
        error
      );

      // Only send error if connection is still open
      if (ws.readyState === 1) {
        try {
          sendError(ws, 'Invalid message format', 4007);
        } catch (sendError) {
          console.error('❌ Failed to send error message to client:', sendError);
        }
      }
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(heartbeatInterval);

    if (currentConnection) {
      // Remove from room if in one
      if (currentConnection.conversationId) {
        removeUserFromRoom(
          currentConnection.conversationId,
          currentConnection.connectionKey
        );

        // Notify others that user left
        broadcastToRoom(currentConnection.conversationId, {
          type: 'user_left',
          payload: {
            userEmail: currentConnection.userEmail,
          },
        });
      }

      connections.delete(currentConnection.connectionKey);

      broadcastGlobal({
        type: 'user_offline',
        payload: {
          userEmail: currentConnection.userEmail,
          userName: currentConnection.userName,
        },
      });
    }
  });

  ws.on('error', (error) => {
    console.error(
      `❌ WebSocket error from ${currentConnection?.userEmail || ip}:`,
      error
    );
    clearInterval(heartbeatInterval);
  });

  ws.on('pong', () => {
    // Silent
  });
});

/**
 * Broadcast message to conversation participants (exported for use in services)
 */
export function broadcastToConversation(
  conversationId: string,
  message: any
) {
  broadcastToRoom(conversationId, message);
}

// Export the WebSocket server for use in main server
export { wss };

// Initialize Notification Broadcast Service
import { initNotificationBroadcast } from './services/notification/NotificationBroadcastService';
initNotificationBroadcast(broadcast, connections);
