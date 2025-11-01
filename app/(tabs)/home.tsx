
import React, { useRef, useEffect, useState, useCallback } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl, 
}
from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '@/constants/api';
import { Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

const API_URL = Api.url; 

const SECTION_HORIZONTAL_PADDING = 20;
const CARD_PREVIEW_SPACE = 20;
const CARD_MARGIN_RIGHT = 15;
const CARD_WIDTH_ACTUAL = width - (SECTION_HORIZONTAL_PADDING * 2) - CARD_PREVIEW_SPACE;

type Job = {
  id: string; 
  ticket_id: string; 
  customer_name: string;
  customer_mobile: string;
  product: string;
  address: string;
  date_time: string;
  status: string;
  accepted: boolean;
};

const getStatusPillProps = (status: Job['status']) => {
  const s = (status || '').toLowerCase();
  if (s === 'accepted') return { backgroundColor: Colors.infoLight, color: Colors.info }; 
  if (s === 'in progress' || s === 'on hold') return { backgroundColor: Colors.warningLight, color: Colors.warning };
  if (s === 'completed') return { backgroundColor: Colors.successLight, color: Colors.success };
  if (s === 'cancelled' || s === 'declined') return { backgroundColor: Colors.errorLight, color: Colors.error };
  
  return { backgroundColor: '#e0e0e0', color: '#555' }; 
};

const JobCard = ({ job, onPress }: { job: Job; onPress: () => void }) => {
  const { ticket_id, customer_name, customer_mobile, date_time, status } = job;
  const { backgroundColor, color } = getStatusPillProps(status);

  const formattedTime = new Date(date_time).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity style={jobCardStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[jobCardStyles.statusPill, { backgroundColor }]}>
        <Text style={[jobCardStyles.statusText, { color }]}>{status}</Text>
      </View>

      <View style={jobCardStyles.firstDetailRow}>
        <Text style={jobCardStyles.cardTitle} numberOfLines={1}>
          {ticket_id}
        </Text>
      </View>

      <View style={jobCardStyles.detailRow}>
        <Text style={jobCardStyles.detailLabel}>Customer:</Text>
        <Text style={jobCardStyles.detailValue} numberOfLines={1}>
          {customer_name}
        </Text>
      </View>

      <View style={jobCardStyles.detailRow}>
        <Text style={jobCardStyles.detailLabel}>Time:</Text>
        <Text style={jobCardStyles.detailValue} numberOfLines={1}>
          {formattedTime}
        </Text>
      </View>

      <View style={[jobCardStyles.detailRow, { borderBottomWidth: 0 }]}>
        <Text style={jobCardStyles.detailLabel}>Mobile:</Text>
        <Text style={jobCardStyles.detailValue} numberOfLines={1}>
          {customer_mobile}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function Home() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  
  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    if (!isRefresh) setLoading(true); 
    
    try {
      const response = await fetch(`${API_URL}/tickets`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data: Job[] = await response.json();
      setTickets(data);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      Alert.alert('Network Error', 'Failed to fetch tickets.\nPlease check internet or try again later.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };
  
  
  useFocusEffect(
    useCallback(() => {
     
      fetchTickets(); 
      return () => {
        
      };
    }, [])
  );
  
  // ADDED: Handler for Pull-to-Refresh
  const onRefresh = useCallback(() => {
    fetchTickets(true);
  }, []);

  const now = new Date();
  const finishedStatuses = new Set(['completed', 'cancelled', 'declined']);

  // --- 1. Today's Jobs Logic (Only active tasks for today) ---
  const todayJobs = tickets.filter(t => {
    const ticketDate = new Date(t.date_time);
    const statusLower = (t.status || '').toLowerCase();
    
    // Check 1: Is the date today?
    const isToday = (
      ticketDate.getFullYear() === now.getFullYear() &&
      ticketDate.getMonth() === now.getMonth() &&
      ticketDate.getDate() === now.getDate()
    );

    // Check 2: Is the status NOT a final/finished state?
    const isNotFinished = !finishedStatuses.has(statusLower);
    
    // Combine conditions: It must be today AND not finished.
    return isToday && isNotFinished;
  });
  
  // Define today at midnight (00:00:00) for strict "previous day" comparison
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  // --- 2. Pending Tasks Logic (Previous Days Overdue) ---
  const pendingTasks = tickets.filter(t => {
    const ticketDate = new Date(t.date_time);
    const statusLower = (t.status || '').toLowerCase();
    
    // Condition 1: Ticket must be accepted
    const isAccepted = !!t.accepted; 
    
    // Condition 2: Scheduled date must be strictly BEFORE today
    const isFromPreviousDay = ticketDate.getTime() < todayMidnight.getTime(); 
    
    // Condition 3: Status is NOT one of the finished states
    const isNotFinished = !finishedStatuses.has(statusLower); 
    
    return isAccepted && isFromPreviousDay && isNotFinished;
  });

  const handleNotificationPress = () => router.push('../notification');
  

  const handleCardPress = (jobTicketId: string) =>
    router.push({ pathname: '../details', params: { id: jobTicketId } });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.menuIcon} onPress={handleNotificationPress}>
          <Ionicons name="notifications-outline" size={28} color={Colors.textDark} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          // RefreshControl for Pull-to-Refresh
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          
          {/* Today's Jobs */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subHeading}>Today's Jobs ({todayJobs.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobList}>
              {todayJobs.length > 0 ? (
                // Passing job.ticket_id here
                todayJobs.map(job => <JobCard key={job.id} job={job} onPress={() => handleCardPress(job.ticket_id)} />)
              ) : (
                <Text style={{ color: Colors.textGray, paddingLeft: 10, fontFamily: Fonts.regular }}>No active jobs for today</Text>
              )}
            </ScrollView>
          </View>

          {/* Pending Tasks (Previous Days Overdue) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.subHeading}>Pending Tasks ({pendingTasks.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobList}>
              {pendingTasks.length > 0 ? (
                // Passing job.ticket_id here
                pendingTasks.map(job => <JobCard key={job.id} job={job} onPress={() => handleCardPress(job.ticket_id)} />)
              ) : (
                <Text style={{ color: Colors.textGray, paddingLeft: 10, fontFamily: Fonts.regular }}>No pending tasks</Text>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const jobCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0E0E3',
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    width: CARD_WIDTH_ACTUAL,
    marginRight: CARD_MARGIN_RIGHT,
    position: 'relative',
  },
  firstDetailRow: {
    marginTop: 10,
    paddingTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 8,
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: { 
    fontSize: 14, 
    
    color: Colors.textGray, 
    flex: 1,
    fontFamily: Fonts.medium, 
  },
  detailValue: { 
    fontSize: 14, 
   
    color: Colors.textDark, 
    flex: 2, 
    textAlign: 'right',
    fontFamily: Fonts.semiBold, 
  },
  cardTitle: { 
    fontSize: 16, 
   
    color: Colors.textDark,
    fontFamily: Fonts.bold, 
  },
  statusPill: { 
    position: 'absolute', 
    top: 10, 
    right: 15, 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  statusText: { 
    fontSize: 12, 
   
    textTransform: 'uppercase',
    fontFamily: Fonts.semiBold, 
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgLight },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 50 },
  sectionContainer: { paddingVertical: 10, paddingHorizontal: 20 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.bgLight,
  },
  headerTitle: { 
    fontSize: 32, 
   
    color: Colors.textDark,
    fontFamily: Fonts.bold, 
  },
  menuIcon: { padding: 5 },
  subHeading: {
    fontSize: 20,
   
    color: Colors.textDark,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 8,
    fontFamily: Fonts.semiBold, 
  },
  jobList: { paddingRight: CARD_PREVIEW_SPACE },
  loadingText: { 
    marginTop: 10, 
    color: Colors.textGray, 
    fontFamily: Fonts.regular,
  },
});