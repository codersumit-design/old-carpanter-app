import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardTypeOptions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Api } from '@/constants/api';
import { Fonts } from '@/constants/Fonts';

type FieldProps = {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  isEditable?: boolean;
  keyboardType?: KeyboardTypeOptions;
};

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  isEditable = true,
  keyboardType = 'default',
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    {isEditable ? (
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#999"
      />
    ) : (
      <View style={styles.displayValueContainer}>
        <Text style={styles.displayValue}>{value}</Text>
      </View>
    )}
  </View>
);

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_URL = `${Api.url}/user`; 


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        Alert.alert('Network Error', 'Failed to fetch user data. Please check your internet or API.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    if (!user?.name || !user?.email || !user?.address) {
      Alert.alert('Error', 'Please fill all required fields (Name, Email, Address).');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error('Failed to update user');
      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save data. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => router.replace('../login') },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.textGray }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={50} color={Colors.error} />
        <Text style={{ marginTop: 10, fontSize: 16, color: Colors.error, textAlign: 'center' }}>
          Unable to load profile. Please check your connection.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />
      
      {/* 1. Header (Shadow/Elevation removed) */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Profile</Text>
        {/* Placeholder to keep consistent spacing */}
        <View style={{ width: 30 }} /> 
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header (Moved inside ScrollView) */}
        <View style={styles.profileHeader}>
          <View style={styles.imageWrapper}>
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          </View>

          <View style={styles.profileDetails}>
            <Text style={styles.profileNameSmall}>{user.name}</Text>
            <Text style={styles.profileMobile}>Mobile: {user.mobile}</Text>
          </View>

          <TouchableOpacity
            style={styles.profileEditButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons
              name={isEditing ? 'close-circle' : 'create-outline'}
              size={28}
              color={isEditing ? Colors.error : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Edit Form */}
        {isEditing && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Edit Details</Text>
            <View style={styles.divider} />

            <Field label="Full Name" value={user.name} onChangeText={(text) => setUser({ ...user, name: text })} />
            <Field label="Mobile Number" value={user.mobile} isEditable={false} keyboardType="numeric" />
            <Field label="Email" value={user.email} onChangeText={(text) => setUser({ ...user, email: text })} keyboardType="email-address" />
            <Field label="Current Address" value={user.address} onChangeText={(text) => setUser({ ...user, address: text })} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
          <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgLight },
  
 
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20,
    backgroundColor: '#fff', 
    zIndex: 1, 
    
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textDark, fontFamily: Fonts.bold },

  scrollView: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100, alignItems: 'center' },
  
  
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 10, elevation: 2 },
  imageWrapper: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: Colors.secondary },
  profileImagePlaceholder: { width: '100%', height: '100%', borderRadius: 35, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  profileDetails: { marginLeft: 15, flex: 1 },
  profileNameSmall: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  profileMobile: { fontSize: 14, color: Colors.textGray, marginTop: 2 },
  profileEditButton: { padding: 5, marginLeft: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, width: '100%', elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Colors.textDark, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: Platform.OS === 'ios' ? 12 : 10, fontSize: 16, color: Colors.textDark, backgroundColor: '#fff' },
  displayValueContainer: { padding: Platform.OS === 'ios' ? 12 : 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#f9f9f9' },
  displayValue: { fontSize: 16, color: Colors.textDark },
  saveButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 15 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { flexDirection: 'row', backgroundColor: Colors.error, paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 20, width: '100%' },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});