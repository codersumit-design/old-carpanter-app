import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Api } from '@/constants/api';
import { Fonts } from '@/constants/Fonts';

const API_URL = `${Api.url}/tickets`; 

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleString(undefined, options);
};

const getStatusProps = (status: string) => {
  switch (status) {
    case 'Completed': return { color: '#4CAF50', badgeBg: '#E8F5E9' };
    case 'Cancelled': return { color: Colors.error, badgeBg: '#FFEBEE' };
    case 'Accepted': return { color: '#2196F3', badgeBg: '#E3F2FD' };
    case 'In Progress': return { color: Colors.secondary, badgeBg: '#FFFDE7' };
    default: return { color: Colors.textGray, badgeBg: '#F5F5F5' };
  }
};

const TicketCard = React.memo(({ ticket, onPress }: { ticket: any; onPress: (ticket_id: string) => void }) => {
  const { ticket_id, date_time, status, product } = ticket;
  const { color: statusColor, badgeBg } = getStatusProps(status);
  const displayDateTime = formatDate(date_time);

  return (
    <TouchableOpacity style={cardStyles.cardNew} onPress={() => onPress(ticket_id)} activeOpacity={0.3}>
      <View style={cardStyles.contentRowNew}>
        <View style={cardStyles.details}>
          <View style={cardStyles.detailRowNew}>
            <Text style={cardStyles.ticketIdNew}>Ticket ID: {ticket_id}</Text>
            <Text style={[cardStyles.statusBadge, { color: statusColor, backgroundColor: badgeBg }]}>{status}</Text>
          </View>
          {product && <Text style={cardStyles.assignedDateNew}>Device: {product}</Text>}
          <Text style={cardStyles.assignedDateNew}>Assigned: {displayDateTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function Tickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // ---Fetch Logic ---
  const fetchData = async (isRefresh = false) => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      const acceptedTickets = data.filter((t: any) => t.accepted === true);
      setTickets(acceptedTickets);
    } catch (err) {
      console.error(err);
      if (!isRefresh) { 
        Alert.alert('Network Error', 'Unable to fetch tickets. Please check your API or connection.');
      }
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  // --- Pull-to-Refresh ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, []);

  const uniqueStatuses = useMemo(() => ['All', ...new Set(tickets.map(t => t.status).filter(Boolean))], [tickets]);
  const handleTicketPress = useCallback((ticket_id: string) => router.push({ pathname: '../details', params: { id: ticket_id } }), []);
  const toggleSortDirection = useCallback(() => setSortDirection(p => (p === 'asc' ? 'desc' : 'asc')), []);

  const sortedAndFilteredTickets = useMemo(() => {
    let filtered = tickets;
    if (filterStatus !== 'All') filtered = tickets.filter(t => t.status === filterStatus);
    return [...filtered].sort((a, b) =>
      sortDirection === 'asc'
        ? new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
        : new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    );
  }, [sortDirection, filterStatus, tickets]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />
      
      {/* Header Container */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <Text style={styles.filterDisplay}>{filterStatus !== 'All' ? `Filtered: ${filterStatus}` : 'Showing All'}</Text>
      </View>

      {/* Full-width Filter + Sort bar  */}
      <View style={styles.fullOutline}>
        <View style={styles.fullOutlineInner}>
          <View style={styles.filterGroup}>
            <Text style={styles.prefixLabel}>Filter:</Text>
            <TouchableOpacity
              style={[styles.buttonOutlined, filterStatus !== 'All' && { borderColor: Colors.primary }]}
              onPress={() => setShowFilterOptions(true)}
            >
              <Ionicons
                name={filterStatus !== 'All' ? 'filter' : 'filter-outline'}
                size={16}
                color={filterStatus !== 'All' ? Colors.primary : Colors.textDark}
              />
              <Text style={[styles.buttonText, { fontFamily: Fonts.regular }]}>{filterStatus}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sortGroup}>
            <Text style={styles.prefixLabel}>Sort:</Text>
            <TouchableOpacity style={styles.buttonOutlined} onPress={toggleSortDirection}>
              <Ionicons
                name={sortDirection === 'desc' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={16}
                color={Colors.textDark}
              />
              <Text style={[styles.buttonText, { fontFamily: Fonts.regular }]}>{sortDirection === 'desc' ? 'Newest' : 'Oldest'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Ticket List (Scrollable with RefreshControl) */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.ticketList}>
            {sortedAndFilteredTickets.length > 0 ? (
              sortedAndFilteredTickets.map(ticket => (
                <TicketCard key={ticket.ticket_id} ticket={ticket} onPress={handleTicketPress} />
              ))
            ) : (
              <Text style={[styles.noTicketsText, { fontFamily: Fonts.regular }]}>No tickets found for status "{filterStatus}"</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal animationType="fade" transparent visible={showFilterOptions}>
        <Pressable style={modalStyles.centeredView} onPress={() => setShowFilterOptions(false)}>
          <Pressable style={modalStyles.modalView} onPress={(e) => e.stopPropagation()}>
            <Text style={[modalStyles.modalTitle, { fontFamily: Fonts.bold }]}>Filter by Status</Text>
            <ScrollView style={modalStyles.statusList}>
              {uniqueStatuses.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[modalStyles.statusOption, filterStatus === status && modalStyles.statusOptionSelected]}
                  onPress={() => { setFilterStatus(status); setShowFilterOptions(false); }}
                >
                  <Text style={[modalStyles.statusText, filterStatus === status && modalStyles.statusTextSelected]}>
                    {status}
                  </Text>
                  {filterStatus === status && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgLight },
  
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 10,
    backgroundColor: '#fff', 
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textDark, fontFamily: Fonts.bold },
  filterDisplay: { fontSize: 14, color: Colors.primary, fontFamily: Fonts.medium },
  
  
  fullOutline: { 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    marginBottom: 0,
    zIndex: 1, 
    
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, 
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fullOutlineInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefixLabel: { fontSize: 15, fontWeight: '600', color: Colors.textDark, marginRight: 6, fontFamily: Fonts.medium },
  filterGroup: { flexDirection: 'row', alignItems: 'center' },
  sortGroup: { flexDirection: 'row', alignItems: 'center' },
  buttonOutlined: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff' },
  buttonText: { fontSize: 14, color: Colors.textDark, marginLeft: 5 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  ticketList: { gap: 0 },
  noTicketsText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: Colors.textGray },
});


const cardStyles = StyleSheet.create({
  cardNew: { backgroundColor: '#fff', height: 80, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E3', justifyContent: 'center' },
  contentRowNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  details: { flex: 1, justifyContent: 'space-around', height: '100%' },
  detailRowNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketIdNew: { fontSize: 15, fontWeight: '600', color: Colors.textDark, fontFamily: Fonts.medium },
  assignedDateNew: { fontSize: 13, color: Colors.textGray, fontFamily: Fonts.regular },
  statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden', fontFamily: Fonts.bold },
});

const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 15, padding: 25, alignItems: 'center', width: '80%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: Colors.textDark },
  statusList: { width: '100%', maxHeight: 300 },
  statusOption: { width: '100%', paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statusOptionSelected: { backgroundColor: '#F5F9FE', borderRadius: 8 },
  statusText: { fontSize: 16, color: Colors.textDark, flex: 1, paddingRight: 10, fontFamily: Fonts.regular },
  statusTextSelected: { fontWeight: '700', color: Colors.primary, fontFamily: Fonts.bold },
});