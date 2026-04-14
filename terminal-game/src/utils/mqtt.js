import mqtt from "mqtt";

function normalizePayload(payload) {
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export function initMqtt({
  url,
  topic,
  onMessage,
  onConnect,
  onError,
} = {}) {
  const client = mqtt.connect(url, {
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 5000,
    clientId: `terminal-game-${Math.random().toString(16).slice(2, 10)}`,
  });

  client.on("connect", () => {
    if (topic) {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error("MQTT subscribe failed:", err);
          return;
        }
        console.log(`MQTT subscribed: ${topic}`);
      });
    }
    onConnect?.(client);
  });

  client.on("message", (messageTopic, payloadBuffer) => {
    const payload = payloadBuffer.toString();
    onMessage?.({ topic: messageTopic, payload });
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
    console.info("MQTT tip: browser clients require a WebSocket listener (not plain MQTT/TCP). Check your ws:// host/port and broker listener protocol.");
    onError?.(err);
  });

  return {
    client,
    publish(targetTopic, payload) {
      client.publish(targetTopic, normalizePayload(payload));
    },
    subscribe(targetTopic, callback) {
      client.subscribe(targetTopic, (err) => {
        if (err) {
          console.error("MQTT subscribe failed:", err);
          return;
        }
        callback?.(targetTopic);
      });
    },
    disconnect() {
      client.end(true);
    },
  };
}
