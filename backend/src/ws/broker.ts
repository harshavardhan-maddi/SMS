import http from 'http';
import sockjs from 'sockjs';

interface ActiveConnection {
  conn: sockjs.Connection;
  subscriptions: Map<string, string>; // subscriptionId -> destination
}

const activeConnections = new Set<ActiveConnection>();

// Parse a raw string into a STOMP frame
function parseStompFrame(data: string) {
  const nullIdx = data.indexOf('\0');
  const frameText = nullIdx !== -1 ? data.slice(0, nullIdx) : data;
  
  const parts = frameText.split(/\r?\n\r?\n/);
  const headerPart = parts[0];
  const bodyPart = parts.slice(1).join('\n\n');
  
  const headerLines = headerPart.split(/\r?\n/);
  const command = headerLines[0].trim();
  
  const headers: Record<string, string> = {};
  for (let i = 1; i < headerLines.length; i++) {
    const line = headerLines[i].trim();
    if (line) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        headers[key] = value;
      }
    }
  }
  
  return {
    command,
    headers,
    body: bodyPart.trim()
  };
}

// Serialize a STOMP frame into raw string
function serializeStompFrame(command: string, headers: Record<string, string>, body: string = ''): string {
  let text = `${command}\n`;
  for (const [key, val] of Object.entries(headers)) {
    text += `${key}:${val}\n`;
  }
  text += `\n${body}\0`;
  return text;
}

export function setupWebSocket(server: http.Server) {
  const sockjsServer = sockjs.createServer({
    prefix: '/ws',
    log: (severity, message) => {
      if (severity === 'error') console.error('SockJS Error:', message);
    }
  });

  sockjsServer.on('connection', (conn) => {
    const connectionInfo: ActiveConnection = {
      conn,
      subscriptions: new Map()
    };
    activeConnections.add(connectionInfo);
    
    console.log(`WebSocket Client Connected (id: ${conn.id})`);

    conn.on('data', (message) => {
      try {
        const frame = parseStompFrame(message);
        if (!frame || !frame.command) return;

        if (frame.command === 'CONNECT') {
          // Reply with CONNECTED frame
          const connectedFrame = serializeStompFrame('CONNECTED', {
            version: '1.2',
            'heart-beat': '0,0'
          });
          conn.write(connectedFrame);
        } 
        else if (frame.command === 'SUBSCRIBE') {
          const id = frame.headers['id'];
          const destination = frame.headers['destination'];
          if (id && destination) {
            connectionInfo.subscriptions.set(id, destination);
          }
        } 
        else if (frame.command === 'UNSUBSCRIBE') {
          const id = frame.headers['id'];
          if (id) {
            connectionInfo.subscriptions.delete(id);
          }
        }
        else if (frame.command === 'DISCONNECT') {
          const receiptId = frame.headers['receipt'];
          if (receiptId) {
            const receiptFrame = serializeStompFrame('RECEIPT', {
              'receipt-id': receiptId
            });
            conn.write(receiptFrame);
          }
          conn.close();
        }
      } catch (err) {
        console.error('Error handling WebSocket frame:', err);
      }
    });

    conn.on('close', () => {
      activeConnections.delete(connectionInfo);
      console.log(`WebSocket Client Disconnected (id: ${conn.id})`);
    });
  });

  sockjsServer.installHandlers(server);
}

// Broadcast message to all matching subscribers
export function sendToTopic(destination: string, payload: any) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const jsonHeaders = {
    destination,
    'content-type': 'application/json',
    'message-id': `msg-${Math.random().toString(36).substring(2, 9)}`
  };
  
  for (const client of activeConnections) {
    for (const [subId, dest] of client.subscriptions.entries()) {
      if (dest === destination) {
        const frame = serializeStompFrame('MESSAGE', {
          ...jsonHeaders,
          subscription: subId
        }, body);
        client.conn.write(frame);
      }
    }
  }
}
