import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    StatusBar,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LoadingOverlay from '../components/LoadingOverlay';
import { Colors } from '../constants/Colors';
import { Fonts } from '@/constants/Fonts';

const Notification = ({ fadeAnim, notificationState }: { fadeAnim: Animated.Value, notificationState: { show: boolean, text: string, type: 'success' | 'error', smallText?: string }}) => {
    if (!notificationState.show) return null;
    
    const { text, type, smallText } = notificationState;
    const bgColor = type === 'success' ? Colors.success : Colors.error;

    return (
        <Animated.View
            style={[
                notificationStyles.notification,
                { opacity: fadeAnim, backgroundColor: bgColor },
            ]}
        >
            <View style={notificationStyles.content}>
                <Text style={[notificationStyles.notifyText, { fontFamily: Fonts.medium }]}>{text}</Text>
                <TouchableOpacity 
                    style={notificationStyles.closeButton} 
                    onPress={() => fadeAnim.setValue(0)} 
                >
                    <Text style={{ color: '#fff', fontSize: 20 }}>&times;</Text>
                </TouchableOpacity>
            </View>
            {smallText && (
                <Text style={[notificationStyles.smallText, { fontFamily: Fonts.regular }]}>{smallText}</Text>
            )}
        </Animated.View>
    );
};

export default function LoginScreen() {
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [notificationState, setNotificationState] = useState<{
        show: boolean;
        text: string;
        type: 'success' | 'error';
        smallText: string;
    }>({
        show: false,
        text: '',
        type: 'success',
        smallText: '',
    });
    
    const fadeAnim = useState(new Animated.Value(0))[0];
    const router = useRouter();

    const triggerNotification = (text: string, type: 'success' | 'error', smallText: string = '') => {
        setNotificationState({ show: true, text, type, smallText });
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }).start(() => setNotificationState(prev => ({ ...prev, show: false })));
            }, 3000);
        });
    };

    const sendOtp = async () => {
        const indianMobileRegex = /^[6-9]\d{9}$/; 
        if (!indianMobileRegex.test(mobile)) {
            triggerNotification('Please enter a valid 10-digit Indian mobile number.', 'error');
            return;
        }
        
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            triggerNotification('OTP sent successfully!', 'success', 'Use default OTP 123456');
            setTimeout(() => {
                router.push({ pathname: '/otp', params: { mobile } });
            }, 1200);
        } catch (error) {
            triggerNotification('Failed to send OTP. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = !/^\d{10}$/.test(mobile) || loading;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />
            <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
                <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.top}>
                        <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                    </View>
                    <View style={styles.center}>
                        <Text style={styles.subtitle}>Welcome back! Please enter your mobile number to continue.</Text>
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>Mobile Number</Text>
                            <View style={styles.phoneInputContainer}>
                                <Text style={styles.countryCode}>+91</Text>
                                <TextInput
                                    style={styles.input}
                                    value={mobile}
                                    onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    placeholder="Enter 10-digit mobile"
                                    placeholderTextColor={Colors.textGray}
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.button, { backgroundColor: isButtonDisabled ? Colors.secondary : Colors.primary }]}
                            onPress={sendOtp}
                            disabled={isButtonDisabled}
                        >
                            <Text style={styles.buttonText}>Get OTP</Text>
                        </TouchableOpacity>
                        <Text style={styles.terms}>
                            By continuing, you agree to our {' '}
                            <Text style={styles.termsLink}>Terms of Service</Text> and {' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {loading && <LoadingOverlay visible={false} />}
            <Notification fadeAnim={fadeAnim} notificationState={notificationState} />
        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgLight },
    keyboardAvoidingView: { flex: 1 },
    scrollViewContent: { flexGrow: 1, paddingBottom: 20 },
    top: { alignItems: 'center', marginBottom: 20, marginTop: 20 }, 
    logo: { width: width * 0.6, height: width * 0.4, marginTop: 40 },
    center: { alignItems: 'center', paddingHorizontal: 30, marginTop: 10, width: '100%' },
    subtitle: { textAlign: 'center', color: Colors.textDark, marginTop: 12, fontSize: 16, maxWidth: 340, fontWeight: '400', fontFamily: Fonts.regular },
    inputWrap: { width: '100%', marginTop: 30 },
    inputLabel: { color: Colors.textGray, marginBottom: 8, fontSize: 14, marginLeft: 2, fontWeight: '500', fontFamily: Fonts.medium },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgLight,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8E8EA',
        paddingHorizontal: 16,
    },
    countryCode: { fontSize: 18, fontWeight: '600', color: Colors.textDark, marginRight: 10, paddingVertical: 14, fontFamily: Fonts.semiBold },
    input: { flex: 1, paddingVertical: 14, fontSize: 18, color: Colors.textDark, fontWeight: '600', paddingHorizontal: 0, backgroundColor: 'transparent', fontFamily: Fonts.semiBold },
    button: { width: '100%', marginTop: 35, paddingVertical: 18, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: Fonts.bold },
    terms: { color: Colors.textGray, fontSize: 13, textAlign: 'center', marginTop: 20, paddingHorizontal: 6, fontFamily: Fonts.regular },
    termsLink: { color: Colors.primary, fontWeight: '600', fontFamily: Fonts.medium },
});

const notificationStyles = StyleSheet.create({
    notification: {
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 1000,
        paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 20) + 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
        alignItems: 'flex-start',
    },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
    notifyText: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
    smallText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2, marginLeft: 18 },
    closeButton: { marginLeft: 15, padding: 5 },
});
