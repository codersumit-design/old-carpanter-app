import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Tab Bar Styling
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textGray,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          
          // height: Platform.OS === 'ios' ? 95 : 70, // REMOVED
          borderTopWidth: 0, 
          // paddingBottom: Platform.OS === 'android' ? 5 : 0,
          
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 5,
          elevation: 5,
        },
      
        tabBarItemStyle: {
          paddingVertical: 5, 
        },
        
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
         
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Tickets',
          
          tabBarIcon: ({ color }) => <Ionicons name="documents" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
      
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}