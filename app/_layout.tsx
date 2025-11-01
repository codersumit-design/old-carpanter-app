// root  _layout.tsx
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications'; // Notifications import kiye
import { Stack, router } from 'expo-router'; // 'router' for deep linking
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react'; // useRef import kiya
import { Image, Platform, Text, View } from 'react-native'; // Platform import kiya
import 'react-native-reanimated';
import { loadFonts } from '../constants/Fonts';
// Aapko yeh utility function banana hoga (jaise ki '../utils/registerForPushNotificationsAsync')
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotificationsAsync';

// --- Global Setup ---

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

//  Global notification handler: Yeh define karta hai ki jab app foreground mein ho toh kya ho
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true, // Required for recent Expo SDKs
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

//  INTERFACE: Notification data payload ko define karne ke liye
interface NotificationData {
    targetScreen: string; // Jaise 'details' ya 'notification'
    itemId: string;       // Jaise '12345'
    [key: string]: any;   // Baaki data bhi ho sakta hai
}


// --- Root Layout Component ---

export default function RootLayout() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  
  // State to hold notification response (for deep linking)
  const [notificationResponse, setNotificationResponse] = 
    useState<Notifications.NotificationResponse | null>(null);

  // Refs for cleanup
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);


  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.hideAsync();
        await loadFonts();
        // 2.5 sec splash delay (aapka original logic)
        await new Promise(resolve => setTimeout(resolve, 2500)); 

        // ✅ 1. Notification Channel (Android-specific)
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        //  2. Fetch FCM token and register
        // NOTE: Agar aap TypeScript use kar rahe hain, toh yeh function async string | null return karna chahiye
        const token = await registerForPushNotificationsAsync(); 
        console.log('📱 FCM Token:', token); 
        // Yahaan aap is token ko apne server par bhej sakte hain

        // ✅ 3. Listeners setup: Notification received (Foreground)
        notificationListener.current = Notifications.addNotificationReceivedListener(
          notification => {
            console.log('📩 Notification received (foreground):', notification.request.content.title);
            // Aap yahaan koi local banner dikha sakte hain
          }
        );

        // ✅ 4. Listeners setup: Notification response (User taps on notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          response => {
            console.log('👆 Notification tapped / storing response...');
            setNotificationResponse(response); // Deep linking ke liye response store kiya
          }
        );
        
        // ✅ 5. Check for initial response (App killed state se launch hone par)
        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse) {
            console.log("💥 App launched from notification. Storing initial response.");
            setNotificationResponse(initialResponse);
        }

      } catch (e) {
        console.warn('❌ Error in prepare/notification setup:', e);
      } finally {
        setShowCustomSplash(false);
      }
    }

    prepare();
    
    // 🧹 Cleanup listeners when the component unmounts
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []); // Splash & Notification setup only runs once


  // 🧭 Deep Linking/Navigation Logic
  useEffect(() => {
    // Splash screen hatne ke baad aur jab notificationResponse available ho
    if (!showCustomSplash && notificationResponse) {
      
      // 🚀 Type Assertion (Data ko as 'NotificationData' treat karna)
      const data = notificationResponse.notification.request.content.data as NotificationData;
      
      const targetScreen = data.targetScreen; 
      // Ensure itemId is treated as a string or null/undefined
      const itemId = data.itemId ? String(data.itemId) : undefined;
      
      console.log(`🧭 Deep Link: Navigating to: ${targetScreen} with ID: ${itemId}`);

      // 🚀 Type Guard - Check if targetScreen is a valid non-empty string
      if (typeof targetScreen === 'string' && targetScreen.length > 0) {
          
          // FIX: 'pathname' error fix: Dynamic string path ko 'any' se cast kiya 
          // taki TypeScript hardcoded path list ko enforce na kare.
          router.push({
              pathname: `/${targetScreen}` as any, // 👈 FIX applied here
              params: { 
                  itemId: itemId || '', // 'itemId' is ensured to be string
              }, 
          });
          
          // Navigation ke baad response ko clear kar dein (taki dobara navigate na ho)
          setNotificationResponse(null); 
      }
    }
    // Yeh effect tabhi chalega jab splash screen chala jaayega ya notificationResponse change hoga
  }, [showCustomSplash, notificationResponse]); 


  if (showCustomSplash) {
    return <CustomSplashScreen />;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      {/* Yahaan koi Auth check logic nahi hai, isliye login se start hoga */}
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ headerShown: false }} />
        <Stack.Screen name="notification" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

// 👇 Custom Splash Screen (Unchanged)
function CustomSplashScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Image
          source={require('../assets/images/logo.png')}
          style={{
            width: 260,
            height: 260,
            resizeMode: 'contain',
          }}
        />

        <View
          style={{
            alignItems: 'flex-end',
            width: '80%',
            marginTop: -20,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#D32F2F',
            }}
          >
            Carpanter
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: '#444',
              marginTop: 4,
            }}
          >
            the fastest way to a locked door
          </Text>
        </View>
      </View>
    </View>
  );
}
