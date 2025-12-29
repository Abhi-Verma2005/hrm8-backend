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

console.log('🚀 Starting WebSocket server initialization...');

// Connection management
const connections = new Map<string, ClientConnection>();
const conversationRooms = new Map<string, Set<string>>();

const buildConnectionKey = (userType: 'USER' | 'CANDIDATE', userId: string) =>
  `${userType}:${userId}`;

const resolveParticipantType = (userType: 'USER' | 'CANDIDATE'): ParticipantType => {
  if (userType === 'USER') return ParticipantType.EMPLOYER;
  return ParticipantType.CANDIDATE;
};

const describeConnectionKey = (connectionKey: string) => {
  const connection = connections.get(connectionKey);
  return connection ? `${connection.userEmail} (${connectionKey})` : connectionKey;
};

const logRoomState = (conversationId?: string) => {
  if (conversationId) {
    const room = conversationRooms.get(conversationId);
    if (!room) {
      console.log(`📭 Room state for ${conversationId}: <none>`);
    } else {
      console.log(
        `📭 Room state for ${conversationId}: size=${room.size}, members=${Array.from(room)
          .map(describeConnectionKey)
          .join(', ') || '<empty>'}`
      );
    }
  } else {
    console.log(
      `📚 Conversation rooms summary: totalRooms=${conversationRooms.size}, ids=${Array.from(
        conversationRooms.keys()
      ).join(', ') || '<none>'}`
    );
  }
};

console.log('📊 Initialized connection maps and room management');

// WebSocket Server - will be attached to main server
const wss = new WebSocketServer({ noServer: true });
console.log('🌐 WebSocket server instance created');

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

  console.log(`📢 Broadcasting message type: ${message.type} with mode: ${type}`);

  let targetKeys: string[] = [];

  switch (type) {
    case 'room':
      if (!conversationId) {
        console.log(`❌ Room broadcast requires conversationId`);
        return;
      }

      const room = conversationRooms.get(conversationId);
      if (!room) {
        console.log(`❌ No room found for conversation ${conversationId}`);
        logRoomState(conversationId);
        logRoomState();
        return;
      }

      targetKeys = Array.from(room);
      console.log(
        `👥 Room ${conversationId} has ${targetKeys.length} participants: ${targetKeys
          .map(describeConnectionKey)
          .join(', ')}`
      );
      break;

    case 'global':
      targetKeys = Array.from(connections.keys());
      console.log(`🌍 Global broadcast to ${targetKeys.length} connected users`);
      break;

    case 'users':
      if (!targetConnectionKeys || targetConnectionKeys.length === 0) {
        console.log(`❌ Users broadcast requires targetConnectionKeys array`);
        return;
      }

      targetKeys = targetConnectionKeys;
      console.log(
        `🎯 Targeted broadcast to ${targetKeys.length} specific users: ${targetKeys
          .map(describeConnectionKey)
          .join(', ')}`
      );
      break;

    default:
      console.log(`❌ Unknown broadcast type: ${type}`);
      return;
  }

  // Filter out excluded user
  if (excludeConnectionKey) {
    targetKeys = targetKeys.filter((key) => key !== excludeConnectionKey);
    console.log(`⏭️ Excluding user: ${describeConnectionKey(excludeConnectionKey)}`);
  }

  console.log(`📤 Sending to ${targetKeys.length} users`);
  logRoomState(conversationId);

  // Send message to all target users
  let successCount = 0;
  let failCount = 0;

  targetKeys.forEach((connectionKey) => {
    const connection = connections.get(connectionKey);
    if (connection && connection.ws.readyState === 1) {
      try {
        connection.ws.send(JSON.stringify(message));
        successCount++;
      } catch (error) {
        failCount++;
        // Only log errors, not every successful send to reduce memory accumulation
        console.error(`❌ Failed to send to ${describeConnectionKey(connectionKey)}:`, error);
      }
    } else {
      failCount++;
    }
  });

  // Only log if there were failures or in debug mode
  if (failCount > 0 || process.env.DEBUG_WEBSOCKET === 'true') {
    console.log(
      `📊 Broadcast complete: ${successCount} successful, ${failCount} failed`
    );
  }
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
  console.log(`➕ Adding user ${describeConnectionKey(connectionKey)} to room ${conversationId}`);

  if (!conversationRooms.has(conversationId)) {
    console.log(`🆕 Creating new room for conversation ${conversationId}`);
    conversationRooms.set(conversationId, new Set());
  }

  conversationRooms.get(conversationId)!.add(connectionKey);
  console.log(
    `✅ User ${describeConnectionKey(connectionKey)} added to room. Room size: ${conversationRooms.get(conversationId)!.size}`
  );
  logRoomState(conversationId);
};

/**
 * Remove user from conversation room
 */
const removeUserFromRoom = (conversationId: string, connectionKey: string) => {
  console.log(`➖ Removing user ${describeConnectionKey(connectionKey)} from room ${conversationId}`);

  const room = conversationRooms.get(conversationId);
  if (room) {
    room.delete(connectionKey);
    console.log(`✅ User removed. Room size: ${room.size}`);

    if (room.size === 0) {
      console.log(`🗑️ Room ${conversationId} is empty, deleting room`);
      conversationRooms.delete(conversationId);
    }
    logRoomState(conversationId);
  } else {
    console.log(
      `❌ Room ${conversationId} not found when trying to remove user ${describeConnectionKey(connectionKey)}`
    );
  }
};

/**
 * Get conversation messages
 */
const getConversationMessages = async (conversationId: string) => {
  console.log(`💬 Fetching messages for conversation ${conversationId}`);

  try {
    const messages = await ConversationService.listMessages(conversationId, 50);
    console.log(
      `✅ Found ${messages.length} messages for conversation ${conversationId}`
    );
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
  console.log(`❌ Sending error to client: ${message} (code: ${code})`);

  if (ws.readyState === 1) {
    // WebSocket.OPEN = 1
    ws.send(
      JSON.stringify({
        type: 'error',
        payload: { message, code },
      })
    );
    console.log(`✅ Error message sent successfully`);
  } else {
    console.log(`❌ Cannot send error - WebSocket is not open`);
  }
};

// WebSocket connection handler
wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
  const ip = req.socket.remoteAddress;
  console.log(`🔌 New WebSocket connection from ${ip}`);
  console.log(`📊 Total active connections: ${connections.size + 1}`);

  let currentConnection: ClientConnection | null = null;
  let isAuthenticated = false;
  let heartbeatInterval: NodeJS.Timeout;

  console.log(`📤 Sending connection established message to ${ip}`);

  // Send initial connection success
  ws.send(
    JSON.stringify({
      type: 'connection_established',
      payload: { message: 'Connected to server. Please authenticate.' },
    })
  );

  console.log(`💓 Starting heartbeat for connection ${ip}`);

  // Heartbeat to keep connection alive
  // Reduced logging to prevent memory accumulation - only log errors
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === 1) {
      // WebSocket.OPEN = 1
      // Removed verbose logging - ping silently
      ws.ping();
    } else {
      // Only log when connection is actually closed
      console.log(
        `💔 Heartbeat failed - connection closed for ${currentConnection?.userEmail || ip}`
      );
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

    console.log(`💾 Storing connection for user: ${authResult.email} with key ${connectionKey}`);
    connections.set(connectionKey, currentConnection);
    isAuthenticated = true;

    console.log(`✅ Authentication successful for ${authResult.email}`);
    console.log(`📊 Total authenticated connections: ${connections.size}`);
    console.log(
      `🗂️ Active connection keys: ${Array.from(connections.keys()).join(', ') || '<none>'}`
    );

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
    console.log(`❌ Authentication failed for connection from ${ip}`);
    sendError(ws, 'Authentication failed. Please login first.', 4001);
  }

  ws.on('message', (data: Buffer) => {
    console.log(
      `📨 Received message from ${currentConnection?.userEmail || ip}`
    );
    console.log(`📨 Raw message data:`, data.toString());

    try {
      const message: WSMessage = JSON.parse(data.toString());
      console.log(`📨 Parsed message type: ${message.type}`);
      console.log(`📨 Message payload:`, message.payload);

      // Handle authentication first
      if (!isAuthenticated && message.type !== 'authenticate') {
        console.log(
          `🚫 Unauthenticated user trying to send ${message.type} message`
        );
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
          console.log(`🚪 Processing join_conversation request`);
          (async () => {
            try {
              if (!currentConnection) {
                console.log(`❌ Join conversation attempted without authentication`);
                sendError(ws, 'Not authenticated', 4001);
                return;
              }

              console.log(
                `🚪 User ${currentConnection.userEmail} attempting to join conversation`
              );

              const { conversationId } = message.payload;
              console.log(`🚪 Target conversation ID: ${conversationId}`);

              try {
                console.log(
                  `🔍 Fetching conversation from database: ${conversationId}`
                );

              // Fetch conversation from database
              const conversation = await ConversationService.getConversation(conversationId);

              if (!conversation) {
                console.log(`❌ Conversation not found: ${conversationId}`);
                sendError(ws, 'Conversation not found', 4004);
                return;
              }

              console.log(`✅ Conversation found: ${conversation.id}`);
              console.log(
                `👥 Conversation participants:`,
                conversation.participants.map((p) => `${p.participant_type}:${p.participant_email}`)
              );

              const isParticipant = conversation.participants.some(
                (p) => p.participant_id === currentConnection.userId
              );

              if (!isParticipant) {
                console.log(
                  `🚫 Access denied - ${currentConnection.userEmail} not in participants list`
                );
                sendError(ws, 'Access denied to this conversation', 4003);
                return;
              }

              console.log(
                `✅ User ${currentConnection.userEmail} is authorized for conversation ${conversationId}`
              );
              console.log(
                `🧩 Participant resolution => email=${currentConnection.userEmail}, connectionKey=${currentConnection.connectionKey}`
              );

              // Leave previous room if any
              if (currentConnection.conversationId) {
                console.log(
                  `🚪 User leaving previous conversation: ${currentConnection.conversationId}`
                );
                removeUserFromRoom(
                  currentConnection.conversationId,
                  currentConnection.connectionKey
                );
              }

              // Join new room
              console.log(
                `🚪 User joining new conversation: ${conversationId}`
              );
              currentConnection.conversationId = conversationId;
              addUserToRoom(conversationId, currentConnection.connectionKey);
              logRoomState(conversationId);

              // Send recent messages
              console.log(
                `💬 Loading conversation messages for ${conversationId}`
              );
              const conversationMessages = await getConversationMessages(conversationId);
              console.log(
                `📤 Sending ${conversationMessages.length} messages to ${currentConnection.userEmail}`
              );

              ws.send(
                JSON.stringify({
                  type: 'messages_loaded',
                  payload: {
                    conversationId,
                    messages: conversationMessages.map((msg) => ({
                      ...msg,
                      isOwn: msg.sender_id === currentConnection!.userId,
                    })),
                  },
                })
              );

              console.log(
                `✅ Messages sent successfully to ${currentConnection.userEmail}`
              );

              // Mark messages as read
              console.log(
                `👁️ Marking messages as read for ${currentConnection.userEmail} in conversation ${conversationId}`
              );

              const updateResult = await ConversationService.markMessagesAsRead(
                conversationId,
                currentConnection.userId
              );
              console.log(`✅ Marked ${updateResult} messages as read`);

              // Notify others in the room that user joined
              console.log(
                `📢 Broadcasting user_joined event for ${currentConnection.userEmail}`
              );
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

              console.log(
                `✅ Join conversation completed successfully for ${currentConnection.userEmail}`
              );
              } catch (error) {
                console.error(
                  `❌ Error joining conversation ${conversationId}:`,
                  error
                );
                console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
                console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                if (ws.readyState === 1) {
                  try {
                    sendError(ws, 'Failed to join conversation', 4500);
                  } catch (sendError) {
                    console.error('❌ Failed to send error message:', sendError);
                  }
                }
              }
            } catch (error) {
              console.error('❌ Outer error in join_conversation:', error);
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
          console.log(`💬 Processing send_message request`);
          (async () => {
            try {
              if (!currentConnection) {
                console.log(`❌ Send message attempted without authentication`);
                sendError(ws, 'Not authenticated', 4001);
                return;
              }

              const { conversationId: msgConvId, content } = message.payload;
            console.log(
              `💬 User ${currentConnection.userEmail} sending message to conversation ${msgConvId}`
            );
            console.log(`💬 Message content: "${content}"`);

            try {
              console.log(
                `🔍 Verifying conversation access for ${msgConvId}`
              );

              // Verify conversation exists and user has access
              const msgConversation = await ConversationService.getConversation(msgConvId);

              if (!msgConversation) {
                console.log(`❌ Conversation not found: ${msgConvId}`);
                sendError(ws, 'Conversation not found', 4004);
                return;
              }

              const isParticipant = msgConversation.participants.some(
                (p) => p.participant_id === currentConnection.userId
              );

              if (!isParticipant) {
                console.log(
                  `🚫 Access denied - ${currentConnection.userEmail} not in participants list`
                );
                sendError(ws, 'Access denied to this conversation', 4003);
                return;
              }

              console.log(
                `✅ User ${currentConnection.userEmail} is authorized for conversation ${msgConvId}`
              );
              console.log(
                `👥 Conversation participants:`,
                msgConversation.participants.map((p) => `${p.participant_type}:${p.participant_email}`)
              );
              logRoomState(msgConvId);

              // Create message in database
              console.log(`💾 Creating message in database...`);

              const newMessage = await ConversationService.createMessage({
                conversationId: msgConvId,
                senderEmail: currentConnection.userEmail,
                senderType: resolveParticipantType(currentConnection.userType),
                senderId: currentConnection.userId,
                content: content.trim(),
              });

              console.log(
                `✅ Message created in database with ID: ${newMessage.id}`
              );

              // Broadcast message to all participants in the conversation
              console.log(
                `📢 Broadcasting new message to conversation participants`
              );

              broadcastToRoom(
                msgConvId,
                {
                  type: 'new_message',
                  payload: {
                    ...newMessage,
                    isOwn: false,
                  },
                },
                currentConnection.connectionKey
              );

              console.log(
                `📤 Sending message confirmation to sender ${currentConnection.userEmail}`
              );
              ws.send(
                JSON.stringify({
                  type: 'message_sent',
                  payload: {
                    ...newMessage,
                    isOwn: true,
                  },
                })
              );

              console.log(
                `✅ Message sent successfully by ${currentConnection.userEmail}`
              );
              } catch (error) {
                console.error(
                  `❌ Error sending message from ${currentConnection.userEmail}:`,
                  error
                );
                console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
                console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                if (ws.readyState === 1) {
                  try {
                    sendError(ws, 'Failed to send message', 4500);
                  } catch (sendError) {
                    console.error('❌ Failed to send error message:', sendError);
                  }
                }
              }
            } catch (error) {
              console.error('❌ Outer error in send_message:', error);
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
          console.log(`❓ Unknown message type received: ${message.type}`);
          sendError(ws, `Unknown message type: ${message.type}`, 4006);
      }
    } catch (error) {
      console.error(
        `❌ Error processing message from ${currentConnection?.userEmail || ip}:`,
        error
      );
      console.error(`📨 Error details:`, error instanceof Error ? error.message : String(error));
      console.error(`📨 Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`📨 Problematic message data:`, data.toString());
      
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
    console.log(`🔌 WebSocket connection closed from ${ip}`);
    console.log(`🔌 Close code: ${code}, Reason: ${reason}`);
    clearInterval(heartbeatInterval);
    console.log(
      `💔 Heartbeat cleared for ${currentConnection?.userEmail || ip}`
    );

    if (currentConnection) {
      console.log(
        `🧹 Cleaning up connection for ${currentConnection.userEmail}`
      );

      // Remove from room if in one
      if (currentConnection.conversationId) {
        console.log(
          `🚪 Removing user from conversation room: ${currentConnection.conversationId}`
        );
        removeUserFromRoom(
          currentConnection.conversationId,
          currentConnection.connectionKey
        );

        // Notify others that user left
        console.log(
          `📢 Broadcasting user_left event for ${currentConnection.userEmail}`
        );
        broadcastToRoom(currentConnection.conversationId, {
          type: 'user_left',
          payload: {
            userEmail: currentConnection.userEmail,
          },
        });
      }

      console.log(
        `🗑️ Removing connection from connections map: ${currentConnection.userEmail}`
      );
      connections.delete(currentConnection.connectionKey);
      console.log(
        `✅ User ${currentConnection.userEmail} disconnected successfully`
      );
      console.log(
        `🗂️ Remaining connection keys: ${Array.from(connections.keys()).join(', ') || '<none>'}`
      );
      logRoomState();

      broadcastGlobal({
        type: 'user_offline',
        payload: {
          userEmail: currentConnection.userEmail,
          userName: currentConnection.userName,
        },
      });

      console.log('Broadcasted user disconnected');
      console.log(`📊 Remaining active connections: ${connections.size}`);
    } else {
      console.log(
        `🤷 Connection closed but no currentConnection found for ${ip}`
      );
    }
  });

  ws.on('error', (error) => {
    console.error(
      `❌ WebSocket error from ${currentConnection?.userEmail || ip}:`,
      error
    );
    console.error('❌ Error details:', error.message, error.stack);
    clearInterval(heartbeatInterval);
    console.log(
      `💔 Heartbeat cleared due to error for ${currentConnection?.userEmail || ip}`
    );
  });

  ws.on('pong', () => {
    console.log(
      `🏓 Pong received from ${currentConnection?.userEmail || ip}`
    );
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

console.log(
  `🎯 WebSocket server setup complete - will be attached to main server`
);

