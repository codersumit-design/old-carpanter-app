import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '@/constants/api';
import { Fonts } from '@/constants/Fonts';

import * as ImagePicker from 'expo-image-picker';

import { Camera } from 'expo-camera'; 

// --- Type Definition for Ticket ---
type Ticket = {
  id: string;
  ticket_id: string;
  customer_name: string;
  customer_mobile: string;
  product: string;
  date_time: string;
  status: string;
  address: string;
  accepted: boolean;
  rejected_reason?: string | null;
};

// --- Mock Photo Upload Type ---
type UploadedPhoto = {
  uri: string;
  angle: string;
};

// --- CONSTANT for file size validation (REMOVED 1MB LIMIT) ---
// const MAX_SIZE_BYTES = 1048576; // Original 1MB
const MAX_SIZE_BYTES = Infinity; // Setting to Infinity to bypass the limit
const API_URL = `${Api.url}/tickets`;

export default function TicketDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  // States for Modals
  const [isDeclineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSourceModalVisible, setSourceModalVisible] = useState(false); 
    
  // Mock state for uploaded photos
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);

  // --- Fetch Ticket Effect ---
  useEffect(() => {
    if (!id) return;
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}?ticket_id=${id}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        if (!text) throw new Error("Received empty response from server.");
          
        const data: Ticket[] = JSON.parse(text); 
          
        if (data.length > 0) {
          setTicket(data[0]);
          setUploadedPhotos([]);
        } else Alert.alert('Not Found', `No ticket found for ID: ${id}`);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        Alert.alert('Network Error', 'Unable to fetch ticket details. Check API URL or server response format.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  // --- Helper to get status color 	---
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return { bg: '#E8F5E9', color: '#4CAF50' };
    if (s === 'cancelled' || s === 'declined') return { bg: '#FFEBEE', color: Colors.error };
    if (s === 'in progress') return { bg: '#FFFDE7', color: Colors.warning };
    if (s === 'accepted') return { bg: '#E3F2FD', color: Colors.info };
    return { bg: '#F5F5F5', color: Colors.textGray };
  };

  // --- Core logic for updating ticket state 	---
  const updateTicketOnServer = async (
    update: Partial<Ticket>,
    successMessage: string
  ) => {
    if (!ticket) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });

      if (!response.ok) throw new Error(`Update failed with status: ${response.status}`);

      setTicket((prevTicket) => ({ ...prevTicket!, ...update }));
      Alert.alert('Success', successMessage);
        
      if (update.status === 'Completed' || update.status === 'Declined') {
        router.back();
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
      Alert.alert('Update Error', 'Unable to update ticket status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Handlers for Accept/Decline---
  const handleAccept = () => {
    updateTicketOnServer(
      { accepted: true, status: 'Accepted', rejected_reason: null },
      'Ticket accepted successfully.'
    );
  };

  const handleDecline = () => {
    setDeclineModalVisible(true);
  };
    
  const confirmDecline = () => {
    if (!declineReason.trim()) {
      Alert.alert('Input Required', 'Please provide a reason for declining the ticket.');
      return;
    }
    setDeclineModalVisible(false);
    updateTicketOnServer(
      { accepted: false, status: 'Declined', rejected_reason: declineReason.trim() },
      'Ticket declined successfully.'
    );
    setDeclineReason('');
  };

  // --- Start Work ---
  const handleStartWork = () => {
    Alert.alert(
      'Confirm Start',
      'Are you ready to start work on this ticket? Status will change to In Progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Work',
          onPress: () => updateTicketOnServer({ status: 'In Progress' }, 'Work started. Status updated to In Progress.'),
        },
      ]
    );
  };

  //logic for img validation
  const processAndValidatePhoto = async (imageUri: string, imageSize: number | undefined) => {
    try {
      // 1. Validate based on size provided directly by ImagePicker
      if (MAX_SIZE_BYTES !== Infinity) { // Skip validation if limit is removed
        if (imageSize === undefined || imageSize === null) {
          // Fallback or error if size is missing from ImagePicker result
          Alert.alert('Error', 'Could not determine photo size. Please try again.');
          return false;
        }
        
        if (imageSize > MAX_SIZE_BYTES) {
          Alert.alert(
            'Photo Too Large',
            `The photo is too large (${(imageSize / 1048576).toFixed(2)} MB). Maximum allowed size is ${(MAX_SIZE_BYTES / 1048576).toFixed(0)}MB. Please compress or choose a different photo.`
          );
          return false;
        }
      }

      // 2. Update state if size is acceptable (or size check is bypassed)
      const angles = ['Before Installation', 'Mid-Installation', 'After Installation'];
      const newPhoto: UploadedPhoto = {
        uri: imageUri,
        angle: angles[uploadedPhotos.length],
      };

      setUploadedPhotos((prevPhotos) => [...prevPhotos, newPhoto]);
      Alert.alert('Photo Upload', `Photo ${uploadedPhotos.length + 1} uploaded: ${newPhoto.angle}`);
      return true;

    } catch (e) {
      console.error('Error checking file size or uploading:', e);
      Alert.alert('Upload Error', 'Could not process the photo file.');
      return false;
    }
  };

  // inage selection
  const handleLaunchCamera = async () => {
    setSourceModalVisible(false); 

    if (uploadedPhotos.length >= 3) return;

    // Request camera permissions (using ImagePicker.request...)
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    // Correctly using MediaTypeOptions.Images
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.7, 
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    // PASS asset.uri AND asset.fileSize directly from the ImagePicker result
    await processAndValidatePhoto(asset.uri, asset.fileSize);
  };
  
  const handleSelectFromGallery = async () => {
    setSourceModalVisible(false); 

    if (uploadedPhotos.length >= 3) return;

    // Request media library permissions (using ImagePicker.request...)
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
      return;
    }

    // Correctly using MediaTypeOptions.Images
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.7, 
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }
    
    const asset = result.assets[0];
    // PASS asset.uri AND asset.fileSize directly from the ImagePicker result
    await processAndValidatePhoto(asset.uri, asset.fileSize);
  };

  // --- Photo Upload Button 	---
  const handlePhotoUpload = () => {
    if (uploadedPhotos.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 photos (different angles) uploaded.');
      return;
    }
    // Open the new image source selection modal
    setSourceModalVisible(true);
  };

  // --- Mark Completed 	---
  const handleMarkCompleted = () => {
    if (uploadedPhotos.length < 3) {
      Alert.alert('Requirement', 'You must upload at least 3 photos before marking as completed.');
      return;
    }
    setOtpModalVisible(true);
  };
    
  const verifyOtpAndComplete = async () => {
    if (otpCode.length !== 6) {
        Alert.alert('Input Required', 'Please enter a 6-digit code.');
        return;
    }
      
    // --- MOCK OTP VALIDATION ---
    setIsUpdating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
      
    if (otpCode !== '123456') { 
        Alert.alert('OTP Error', 'The 6-digit code is incorrect. Please try again.');
        setIsUpdating(false);
        return;
    }
    // --- END MOCK OTP VALIDATION ---
      
    setOtpModalVisible(false);
    updateTicketOnServer({ status: 'Completed' }, 'Ticket marked as Completed.');
    setOtpCode('');
  };

  // --- Render Logic Checks 	---
  const statusLower = (ticket?.status || '').toLowerCase();
    
  const isNewTicket = 
    !ticket?.accepted && 
    statusLower !== 'declined' && 
    statusLower !== 'cancelled';

  const isAcceptedAndPendingStart = 
    ticket?.accepted && 
    statusLower === 'accepted'; 

  const isInProgress = 
    ticket?.accepted && 
    (statusLower === 'in progress' || statusLower === 'on hold'); 

  const isCompleted = statusLower === 'completed';

  const isDeclinedOrCancelled = statusLower === 'declined' || statusLower === 'cancelled';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ticket Details</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching ticket info...</Text>
        </View>
      ) : !ticket ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No ticket found.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            
          {/* Ticket ID */}
          <View style={styles.card}>
            <Text style={styles.label}>Ticket ID</Text>
            <Text style={styles.value}>{ticket.ticket_id}</Text>
          </View>

          {/* Customer Info */}
          <View style={styles.card}>
            <Text style={styles.label}>Customer Name</Text>
            <Text style={styles.value}>{ticket.customer_name}</Text>

            <Text style={styles.label}>Mobile</Text>
            <Text style={styles.value}>{ticket.customer_mobile}</Text>

            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{ticket.address}</Text>
          </View>

          {/* Product Info */}
          <View style={styles.card}>
            <Text style={styles.label}>Product</Text>
            <Text style={styles.value}>{ticket.product}</Text>

            <Text style={styles.label}>Date-Time</Text>
            <Text style={styles.value}>
              {new Date(ticket.date_time).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Status */}
          <View style={styles.statusCard}>
            <Text style={styles.label}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(ticket.status).bg },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(ticket.status).color }]}>
                {ticket.status}
              </Text>
            </View>
          </View>

          {/* --- ACTION SECTION --- */}

          {/* 1. New Ticket: Accept / Decline */}
          {isNewTicket && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton, styles.buttonSpacer]} 
                onPress={handleDecline}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionText}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton]} 
                onPress={handleAccept}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={styles.actionText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
            
          {/* 2. Accepted and Pending Start: Start Button */}
          {isAcceptedAndPendingStart && (
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleStartWork}
                disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Start Work (In Progress)</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 3. In Progress: Upload Photo / Complete */}
          {isInProgress && (
            <>
              <View style={[styles.card, { borderLeftColor: Colors.primary, borderLeftWidth: 4 }]}>
                <Text style={[styles.label, { color: Colors.primary, fontFamily: Fonts.regular }]}>
                    Photos Uploaded: {uploadedPhotos.length} / 3 (Required)
                </Text>
                {uploadedPhotos.map((photo, index) => (
                    <Text key={index} style={styles.photoText}>
                        <Ionicons name="camera" size={12} color={Colors.primary} /> {photo.angle} (No Size Limit)
                    </Text>
                ))}
              </View>

              <View style={styles.buttonGroup}>

                <TouchableOpacity
                  style={[styles.actionButton, styles.uploadButton, styles.buttonSpacer]}
                  onPress={handlePhotoUpload}
                  disabled={uploadedPhotos.length >= 3 || isUpdating}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Upload Photo ({uploadedPhotos.length}/3)</Text>
                </TouchableOpacity>

                {/* Open OTP Modal on Complete Press */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    uploadedPhotos.length < 3 && styles.disabledButton,
                  ]}
                  onPress={handleMarkCompleted}
                  disabled={uploadedPhotos.length < 3 || isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.actionText}>Complete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 4. Declined / Cancelled: Reason */}
          {isDeclinedOrCancelled && (
            <View style={[styles.card, { borderLeftColor: Colors.error, borderLeftWidth: 4 }]}>
              <Text style={styles.label}>
                {statusLower === 'cancelled' ? 'Cancellation Reason' : 'Declined Reason'}
              </Text>
              <Text style={[styles.value, { color: Colors.error }]}>
                {ticket.rejected_reason || 'Reason not provided.'}
              </Text>
            </View>
          )}
            
          {/* 5. Completed: 	*/}
          {isCompleted && (
            <View style={[styles.card, { borderLeftColor: '#4CAF50', borderLeftWidth: 4, alignItems: 'center' }]}>
                <Ionicons name="trophy-outline" size={30} color="#4CAF50" />
                <Text style={[styles.actionText, {color: '#4CAF50', marginTop: 5, marginLeft: 0, fontFamily: Fonts.regular}]}>
                    This ticket is COMPLETED.
                </Text>
            </View>
          )}

        </ScrollView>
      )}
      
      {/* 1.IMAGE SOURCE SELECTION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSourceModalVisible}
        onRequestClose={() => setSourceModalVisible(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Select Image Source</Text>
            <Text style={modalStyles.modalText}>
              Choose whether to take a new photo or select one from your gallery. 
              (No file size limit)
            </Text>
            <View style={modalStyles.modalButtonGroup}>
              {/* Camera Option */}
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.otpConfirmButton, styles.buttonSpacer]}
                onPress={handleLaunchCamera}
                disabled={isUpdating}
              >
                <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={modalStyles.buttonText}>Camera</Text>
              </TouchableOpacity>
              {/* Gallery Option */}
              <TouchableOpacity
                style={[modalStyles.modalButton, styles.actionButton, {backgroundColor: Colors.info, flex: 1}]}
                onPress={handleSelectFromGallery}
                disabled={isUpdating}
              >
                <Ionicons name="images" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={modalStyles.buttonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[modalStyles.modalButton, modalStyles.cancelButton, { width: '100%', marginTop: 15 }]}
              onPress={() => setSourceModalVisible(false)}
              disabled={isUpdating}
            >
              <Text style={modalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. DECLINE REASON MODAL*/}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeclineModalVisible}
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Decline Ticket</Text>
            <Text style={modalStyles.modalText}>Please provide a reason for declining this ticket.</Text>
            <TextInput
              style={[styles.textInput, modalStyles.textInput]}
              placeholder="Enter reason..."
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline={true}
              numberOfLines={4}
              editable={!isUpdating}
            />
            <View style={modalStyles.modalButtonGroup}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.cancelButton]}
                onPress={() => {
                    setDeclineModalVisible(false);
                    setDeclineReason('');
                }}
                disabled={isUpdating}
              >
                <Text style={modalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.confirmButton]}
                onPress={confirmDecline}
                disabled={isUpdating}
              >
                {isUpdating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={modalStyles.buttonText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. OTP VERIFICATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isOtpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Confirm Completion</Text>
            <Text style={modalStyles.modalText}>Please enter the 6-digit verification code to mark as completed.</Text>
              
            <TextInput
              style={[styles.textInput, modalStyles.textInput, { textAlign: 'center' }]}
              placeholder="123456"
              value={otpCode}
              onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').substring(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isUpdating}
            />
              
            <View style={modalStyles.modalButtonGroup}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.cancelButton]}
                onPress={() => {
                    setOtpModalVisible(false);
                    setOtpCode('');
                }}
                disabled={isUpdating}
              >
                <Text style={modalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.otpConfirmButton]}
                onPress={verifyOtpAndComplete}
                disabled={isUpdating || otpCode.length !== 6}
              >
                {isUpdating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={modalStyles.buttonText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        
    </SafeAreaView>
  );
}


const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        marginBottom: 10,
        fontSize: 20,
        textAlign: 'center',
        color: Colors.textDark,
        fontFamily: Fonts.bold,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        color: Colors.textGray,
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    textInput: {
        width: '100%',
        minHeight: 40,
        marginBottom: 20,
        fontFamily: Fonts.regular,
        fontSize: 16,
    },
    modalButtonGroup: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        borderRadius: 8,
        padding: 12,
        elevation: 2,
        alignItems: 'center',
        flexDirection: 'row', 
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#9E9E9E',
        marginRight: 10,
    },
    confirmButton: {
        backgroundColor: Colors.error,
    },
    otpConfirmButton: {
        backgroundColor: Colors.primary,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgLight },
  header: {
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 22,
    color: Colors.textDark,
    fontFamily: Fonts.bold,
  },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { 
    marginTop: 10, 
    color: Colors.textGray, 
    fontFamily: Fonts.regular
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { 
    color: Colors.error, 
    fontSize: 16, 
    fontFamily: Fonts.medium
  },
  scrollView: { flex: 1, padding: 15 },
  scrollContent: { paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    color: '#777',
    fontFamily: Fonts.medium,
    marginBottom: 3,
  },
  value: {
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: 10,
    fontFamily: Fonts.regular,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 1,
    marginBottom: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
  },
  statusText: { 
    fontSize: 14, 
    fontFamily: Fonts.bold
  },
  
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 15,
    borderRadius: 8,
  },
  buttonSpacer: { 
    marginRight: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Fonts.bold,
  },
  declineButton: {
    backgroundColor: Colors.error,
  },
  uploadButton: {
    backgroundColor: Colors.info,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: 10,
    fontFamily: Fonts.regular,
  },
  photoText: {
    fontSize: 14,
    color: Colors.textDark,
    marginTop: 5,
    fontFamily: Fonts.regular,
  }
});