// src/hooks/usePushNotifications.ts

import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync"; // Adjust path as needed

//  Notification handler configuration 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, 
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Custom Hook for setting up and managing Expo Push Notifications.
 * @returns {string | undefined} The Expo Push Token (FCM Token).
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      console.log("🛠 Setting up notifications...");

      //  Create Android notification channel
      if (Platform.OS === "android") {
        console.log("⚙️ Creating Android notification channel...");
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
        console.log("✅ Android channel created: 'default'");
      }

      //  Register device for push notifications
      const token = await registerForPushNotificationsAsync();
      console.log("📱 FCM Token received:", token);
      setExpoPushToken(token);

      // 📩 Listener: when a notification is received while the app is open
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log("📩 Notification received (foreground):");
          // Yahan aap foreground notification data ko handle kar sakte hain
          console.log(JSON.stringify(notification, null, 2));
        }
      );

      //  Listener: when user taps on a notification
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("👆 Notification tapped / responded:");
          // Yahan aap navigation/deep linking logic dalenge
          console.log(JSON.stringify(response, null, 2));
        });
    };

    setupNotifications();

    // 🧹 Cleanup listeners on unmount
    return () => {
      console.log("🧹 Cleaning up notification listeners...");
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []); // Run once on mount

  return expoPushToken;
}