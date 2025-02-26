import mqtt from "mqtt";
import { useAuthStore } from "@/stores/authStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "ws://localhost:9001/mqtt";
console.log("🚀 Connecting to MQTT Broker:", MQTT_BROKER_URL);
let client = null;
let isConnecting = false;
let connectionPromise = null;

// ✅ ฟังก์ชันดึง Client ID ตาม Email ของ User (ป้องกัน clientId ซ้ำกัน)
const getClientId = () => {
  const authStore = useAuthStore();

  if (!authStore.email) {
    return "client_anonymous"; // ✅ สำหรับ User ที่ไม่ได้ Login
  }

  // ✅ ใช้ Email เป็น Client ID (แทนที่อักขระพิเศษ)
  return `client_${authStore.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
};

// ✅ เชื่อมต่อ MQTT Broker (Singleton)
export const connectMQTT = () => {
  if (client && client.connected) {
    console.log("⚠️ MQTT Already Connected.");
    return Promise.resolve(client);
  }

  if (isConnecting) {
    console.log("🔄 Waiting for MQTT connection...");
    return connectionPromise;
  }

  isConnecting = true;
  const options = {
    clean: true,
    connectTimeout: 5000,
    clientId: getClientId(),
    reconnectPeriod: 5000,
  };

  connectionPromise = new Promise((resolve, reject) => {
    console.log("🚀 Connecting to MQTT Broker...", MQTT_BROKER_URL);

    if (client) {
      client.end(true); // ✅ ปิดการเชื่อมต่อเดิมก่อนเปิดใหม่
    }

    client = mqtt.connect(MQTT_BROKER_URL, options);

    client.on("connect", () => {
      console.log(`✅ MQTT Connected as ${options.clientId}`);
      isConnecting = false;
      resolve(client);
    });

    client.on("error", (err) => {
      console.error("❌ MQTT Connection Error:", err.message);
      isConnecting = false;
      reject(err);
    });

    client.on("close", () => {
      console.warn("⚠️ MQTT Disconnected! Reconnecting in 5s...");
      isConnecting = false;
      setTimeout(() => {
        connectMQTT();
      }, 5000);
    });

    client.on("message", handleMQTTMessage);
  });

  return connectionPromise;
};

// ✅ ฟังก์ชันคืนค่า MQTT Client
export const getMQTTClient = () => {
  if (!client || !client.connected) {
    console.warn("⚠️ MQTT Client not connected. Connecting now...");
    return connectMQTT();
  }
  return Promise.resolve(client);
};

// ✅ ฟังก์ชันสำหรับ Publish ข้อความ
export const publishMessage = async (topic, message) => {
  const mqttClient = await getMQTTClient();
  if (mqttClient?.connected) {
    mqttClient.publish(topic, message, { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("❌ MQTT Publish Error:", err);
      } else {
        console.log(`📡 Message published to ${topic}:`, message);
      }
    });
  } else {
    console.error("⚠️ MQTT Client is not connected! Skipping publish.");
  }
};

// ✅ ฟังก์ชันสำหรับ Subscribe Topic พร้อมรอให้ subscribe สำเร็จ
export const subscribeTopic = async (topic) => {
  const mqttClient = await getMQTTClient();

  if (!mqttClient?.connected) {
    console.error(
      `⚠️ MQTT Client is not connected! Skipping subscription to ${topic}`
    );
    return false;
  }

  return new Promise((resolve) => {
    mqttClient.subscribe(topic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}`, err);
        resolve(false);
      } else {
        console.log(`📡 Subscribed to ${topic}`);
        resolve(true);
      }
    });
  });
};

// ✅ ฟังก์ชัน Subscribe ตามอุปกรณ์ของผู้ใช้ (subscribe ทุกหัวข้อพร้อมกัน)
export const subscribeUserTopics = async () => {
  const authStore = useAuthStore();
  const deviceStore = useDeviceStore();

  if (!authStore.isLoggedIn) {
    console.warn("⚠️ User is not logged in. Skipping MQTT subscription.");
    return false;
  }

  if (!deviceStore.isLoaded || deviceStore.devices.length === 0) {
    console.warn("⚠️ No devices found. Skipping MQTT subscription.");
    return false;
  }

  const topics = deviceStore.devices.flatMap((device) => [
    `server/${device.serialNumber}/get/setting`,
    `server/${device.serialNumber}/get/pong`,
    `server/${device.serialNumber}/get/log`,
    `server/${device.serialNumber}/post/response`,
  ]);

  console.log("📡 Subscribing to device-specific topics:", topics);

  // ✅ ใช้ Promise.all() เพื่อ subscribe พร้อมกัน
  const results = await Promise.all(
    topics.map((topic) => subscribeTopic(topic))
  );

  if (results.every((res) => res)) {
    console.log("✅ All topics subscribed successfully.");
    return true;
  } else {
    console.error("❌ Some topics failed to subscribe.");
    return false;
  }
};

// ✅ ฟังก์ชันจัดการข้อความที่รับจาก MQTT
const handleMQTTMessage = (topic, message) => {
  const payload = message.toString();
  //console.log(`📩 Received message from ${topic}:`, payload);

  const topicParts = topic.split("/");
  if (topicParts.length < 3) {
    console.warn("⚠️ Invalid MQTT topic format:", topic);
    return;
  }

  const serialNumber = topicParts[1];
  const deviceStatusStore = useDeviceStatusStore();
  const deviceSettingStore = useDeviceSettingStore();

  if (topic.endsWith("/get/pong")) {
    console.log(`✅ Device ${serialNumber} responded with Pong`);
    const settingData = JSON.parse(payload);
    deviceSettingStore.setDeviceSetting(settingData);
  } else if (topic.endsWith("/get/setting")) {
    try {
      const settingData = JSON.parse(payload);
      deviceSettingStore.setDeviceSetting(settingData);
      deviceStatusStore.setDeviceOnline(serialNumber);
    } catch (error) {
      console.error("❌ Failed to parse setting data:", error);
    }
  }
};
// ✅ รอ MQTT ตอบกลับจาก Hardware
export const waitForMqttResponse = (responseTopic, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`⏳ MQTT Timeout: ไม่ได้รับการตอบกลับจาก ${responseTopic}`);
      reject(new Error("MQTT Timeout"));
    }, timeout);

    const callback = (topic, message) => {
      if (topic === responseTopic) {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log(`📩 ได้รับข้อความจาก ${responseTopic}:`, parsedMessage);
          clearTimeout(timer);
          client.removeListener("message", callback); // ✅ ลบ Listener เพื่อไม่ให้รับค่าซ้ำ
          resolve(parsedMessage);
        } catch (error) {
          console.error("❌ ไม่สามารถแปลง JSON ได้:", error);
          reject(error);
        }
      }
    };

    client.on("message", callback);
  });
};

// ✅ ฟังก์ชัน Unsubscribe และ Disconnect เมื่อ Logout
export const disconnectMQTT = () => {
  if (client) {
    console.log("❌ Disconnecting MQTT and Unsubscribing...");
    client.end();
    client = null;
  }
};

// ✅ Export client สำหรับใช้งานใน Vue
export default {
  connectMQTT,
  getMQTTClient,
  publishMessage,
  subscribeTopic,
  subscribeUserTopics,
  waitForMqttResponse,
  disconnectMQTT,
  handleMQTTMessage,
};
