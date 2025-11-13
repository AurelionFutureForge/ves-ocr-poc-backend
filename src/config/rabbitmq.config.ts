import amqp from "amqplib";
import { env } from "./env/env";

export interface RabbitMQConfig {
  url: string;
  queues: {
    userChatQueue: string;
    groupQueue: string;
  };
  exchanges: {
    userExchange: string;
    groupExchange: string;
  };
  reconnect: {
    maxAttempts: number;
    delay: number;
    backoffFactor: number;
  };
}

export const rabbitMQConfig: RabbitMQConfig = {
  url: env.RABBITMQ_URL || "amqp://localhost:5672",
  queues: {
    userChatQueue: "user_chat_queue",
    groupQueue: "group_queue",
  },
  exchanges: {
    userExchange: "user_exchange",
    groupExchange: "group_exchange",
  },
  reconnect: {
    maxAttempts: 5,
    delay: 3000, // 3 seconds initial delay
    backoffFactor: 1.5 // each retry will wait 1.5x longer
  }
};

let connection: any = null;
let channel: any = null;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

// Setup connection listeners for auto-reconnection
const setupConnectionListeners = (conn: amqp.Connection) => {
  conn.on('error', (err) => {
    console.error('🔥 RabbitMQ connection error:', err.message);
  });

  conn.on('close', () => {
    console.log('🔌 RabbitMQ connection closed unexpectedly');
    connection = null;
    channel = null;
    
    // Try to reconnect
    attemptReconnect();
  });
};

// Function to handle reconnection with exponential backoff
const attemptReconnect = async (): Promise<void> => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (reconnectAttempts >= rabbitMQConfig.reconnect.maxAttempts) {
    console.error(`❌ Failed to reconnect to RabbitMQ after ${reconnectAttempts} attempts, giving up.`);
    return;
  }
  
  reconnectAttempts++;
  
  const delay = rabbitMQConfig.reconnect.delay * 
    Math.pow(rabbitMQConfig.reconnect.backoffFactor, reconnectAttempts - 1);
  
  console.log(`🔄 Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${reconnectAttempts}/${rabbitMQConfig.reconnect.maxAttempts})`);
  
  reconnectTimer = setTimeout(async () => {
    try {
      await connectRabbitMQ();
      console.log(`✅ Successfully reconnected to RabbitMQ on attempt ${reconnectAttempts}`);
      reconnectAttempts = 0;
    } catch (err) {
      console.error(`❌ Reconnection attempt ${reconnectAttempts} failed:`, err);
      attemptReconnect();
    }
  }, delay);
};

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(rabbitMQConfig.url);
    
    // Setup connection listeners
    setupConnectionListeners(connection);
    
    // Create channel
    if (connection) {
      channel = await connection.createChannel();

      // Assert exchanges
      if (channel) {
        // User exchange as fanout (broadcasts to all consumers)
        await channel.assertExchange(rabbitMQConfig.exchanges.userExchange, "fanout", {
          durable: true,
        });
        
        // Group exchange as direct (targeted routing)
        await channel.assertExchange(rabbitMQConfig.exchanges.groupExchange, "direct", {
          durable: true,
        });

        // Assert queues
        await channel.assertQueue(rabbitMQConfig.queues.userChatQueue, { durable: true });
        await channel.assertQueue(rabbitMQConfig.queues.groupQueue, { durable: true });

        // Bind queues to exchanges
        // User queue bound to fanout exchange (no routing key needed)
        await channel.bindQueue(
          rabbitMQConfig.queues.userChatQueue,
          rabbitMQConfig.exchanges.userExchange,
          "" // Empty routing key for fanout
        );
        
        // Group queue bound to direct exchange with routing key
        await channel.bindQueue(
          rabbitMQConfig.queues.groupQueue,
          rabbitMQConfig.exchanges.groupExchange,
          "group.operation"
        );
      }
    }

    console.log("🐇 RabbitMQ connected successfully");
    reconnectAttempts = 0; // Reset on successful connection
  } catch (err) {
    console.error("❌ Failed to connect to RabbitMQ:", err);
    throw err;
  }
};

export const disconnectRabbitMQ = async (): Promise<void> => {
  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log("🔌 RabbitMQ connection closed");
  } catch (err) {
    console.error("❌ Error closing RabbitMQ:", err);
  }
};

export const getRabbitMQChannel = (): any => {
  if (!channel) {
    console.warn("⚠️ RabbitMQ channel not initialized, operations will be skipped");
    return null;
  }
  return channel;
};

export const isRabbitMQConnected = (): boolean => {
  return connection !== null && channel !== null;
};

// Safe publish function with fallback
export const publishToQueue = async (
  queue: string,
  exchange: string,
  routingKey: string,
  message: any
): Promise<boolean> => {
  try {
    const ch = getRabbitMQChannel();
    if (!ch) {
      console.warn(`⚠️ RabbitMQ not available, skipping message to ${queue}`);
      return false;
    }
    
    const success = ch.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (success) {
      console.log(`📤 Message published to ${queue}:`, message);
    } else {
      console.warn(`⚠️ Failed to publish message to ${queue}`);
    }
    
    return success;
  } catch (error) {
    console.error(`❌ Error publishing to ${queue}:`, error);
    return false;
  }
};