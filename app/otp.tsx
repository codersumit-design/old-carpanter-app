import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Dimensions,
    Animated,
    Easing,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoadingOverlay from '../components/LoadingOverlay';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

interface NotificationState {
    text: string;
    type: 'success' | 'error';
    key: number;
}

const Notification = ({ notificationState, onHide }: { notificationState: NotificationState; onHide: () => void }) => {
    const { text, type, key } = notificationState;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
        }).start(() => {
            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }).start(() => onHide());
            }, 3000);

            return () => clearTimeout(timer);
        });
    }, [key]);

    const bgColor = type === 'success' ? Colors.success : Colors.error;
    if (!text) return null;

    return (
        <Animated.View
            key={key}
            style={[notificationStyles.notification, { opacity: fadeAnim, backgroundColor: bgColor }]}
        >
            <View style={notificationStyles.content}>
                <Text style={[notificationStyles.notifyText, { fontFamily: Fonts.medium }]}>{text}</Text>
            </View>
            <Text style={[notificationStyles.smallText, { fontFamily: Fonts.regular }]}>
                Default OTP for testing is 123456
            </Text>
        </Animated.View>
    );
};

export default function OtpScreen() {
    const params = useLocalSearchParams() as { mobile?: string };
    const mobile = params.mobile ?? 'your number';
    const router = useRouter();

    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const inputsRef = useRef<Array<TextInput | null>>([]);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const [resendDisabled, setResendDisabled] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notificationState, setNotificationState] = useState<NotificationState>({
        text: 'OTP sent successfully for now',
        type: 'success',
        key: 1,
    });

    useEffect(() => {
        setNotificationState({ text: `OTP sent to ${mobile}`, type: 'success', key: Date.now() });
        setTimeout(() => inputsRef.current[0]?.focus(), 300);
    }, []);

    const handleNotificationHide = useCallback(() => {
        setNotificationState((prev) => ({ ...prev, text: '' }));
    }, []);

    useEffect(() => {
        let t: ReturnType<typeof setInterval> | undefined;
        if (resendDisabled && timer > 0) {
            t = setInterval(() => {
                setTimer((s) => s - 1);
            }, 1000);
        } else if (timer === 0) {
            setResendDisabled(false);
        }
        return () => {
            if (t) clearInterval(t);
        };
    }, [resendDisabled, timer]);

    const onChange = (text: string, idx: number) => {
        setError(null);
        if (text.length > 1) text = text.charAt(text.length - 1);
        if (text && !/^\d$/.test(text)) return;

        const arr = [...digits];
        arr[idx] = text;
        setDigits(arr);

        if (text !== '' && idx < 5) inputsRef.current[idx + 1]?.focus();
        if (text === '' && idx > 0) inputsRef.current[idx - 1]?.focus();
    };

    const onKeyPress = ({ nativeEvent }: any, idx: number) => {
        if (nativeEvent.key === 'Backspace' && digits[idx] === '' && idx > 0) {
            inputsRef.current[idx - 1]?.focus();
        }
    };

    const resendOtp = async () => {
        if (resendDisabled) return;
        setResendDisabled(true);
        setTimer(30);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setNotificationState({ text: `New OTP sent to ${mobile}!`, type: 'success', key: Date.now() });
        } catch (e) {
            setNotificationState({ text: 'Failed to resend OTP. Please try again.', type: 'error', key: Date.now() });
        }
    };

    const verify = async () => {
        const otp = digits.join('');
        if (otp.length < 6) return;

        setLoading(true);
        setError(null);
        try {
            await new Promise((resolve) => setTimeout(resolve, 900));
            if (otp !== '123456') {
                setError('Invalid OTP. Please check the code.');
                setDigits(['', '', '', '', '', '']);
                inputsRef.current[0]?.focus();
                return;
            }
            router.replace('/(tabs)/home');
        } catch (e) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const boxWidth = (width - 30 * 2 - 5 * 5) / 6;
    const otpBoxes = digits.map((d, i) => (
        <TextInput
            key={i}
            ref={(el) => {
                inputsRef.current[i] = el;
            }}
            style={[
                styles.box,
                {
                    width: boxWidth,
                    borderColor: error ? Colors.error : d ? Colors.primary : '#E0E0E3',
                },
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={d}
            onChangeText={(t) => onChange(t, i)}
            onKeyPress={(e) => onKeyPress(e, i)}
            returnKeyType={i === 5 ? 'done' : 'next'}
            selectionColor={Colors.primary}
            textAlign="center"
        />
    ));

    const isVerifyDisabled = digits.join('').length !== 6 || loading;
    const resendButtonColor = resendDisabled ? Colors.textGray : Colors.primary;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.container}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={60}
                            color={Colors.linkHover}
                            style={styles.headerIcon}
                        />
                        <Text style={styles.title}>Verify OTP</Text>
                        <Text style={styles.subtitle}>We've sent a 6-digit code to {mobile}</Text>

                        <View style={styles.otpRow}>{otpBoxes}</View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <TouchableOpacity
                            style={[
                                styles.verifyBtn,
                                { backgroundColor: isVerifyDisabled ? Colors.secondary : Colors.primary },
                            ]}
                            activeOpacity={0.8}
                            onPress={verify}
                            disabled={isVerifyDisabled}
                        >
                            <Text style={styles.verifyText}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.resendRow}>
                            <Text style={styles.didnt}>Didn't receive the code ?</Text>
                            <TouchableOpacity disabled={resendDisabled} onPress={resendOtp}>
                                <Text
                                    style={[
                                        styles.resend,
                                        { color: resendButtonColor, fontWeight: resendDisabled ? '400' : '600' },
                                    ]}
                                >
                                    {resendDisabled ? `Resend in ${timer}s` : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.demo}>
                            For testing: Use OTP code{' '}
                            <Text style={{ color: Colors.primary, fontWeight: '700', fontFamily: Fonts.bold }}>
                                123456
                            </Text>
                        </Text>

                        {loading && <LoadingOverlay visible={false} />}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <Notification notificationState={notificationState} onHide={handleNotificationHide} />
        </SafeAreaView>
    );
}

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
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 5,
    },
    notifyText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
        fontFamily: Fonts.medium,
    },
    smallText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
        marginLeft: 18,
        fontFamily: Fonts.regular,
    },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgLight },
    keyboardAvoidingView: { flex: 1 },
    scrollViewContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 20 },
    container: { alignItems: 'center', paddingHorizontal: 30, width: '100%', paddingVertical: 20 },
    headerIcon: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '700', color: Colors.textDark, marginBottom: 5, fontFamily: Fonts.bold },
    subtitle: { color: Colors.textGray, marginTop: 10, fontSize: 15, textAlign: 'center', fontFamily: Fonts.regular },
    otpRow: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between', width: '100%' },
    box: {
        height: 55,
        borderRadius: 8,
        borderWidth: 1.5,
        backgroundColor: '#fff',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textDark,
        marginHorizontal: 2.5,
        fontFamily: Fonts.bold,
    },
    verifyBtn: {
        marginTop: 30,
        width: '100%',
        paddingVertical: 18,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    verifyText: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: Fonts.bold },
    resendRow: { flexDirection: 'row', marginTop: 25, alignItems: 'center', justifyContent: 'center' },
    didnt: { color: Colors.textGray, marginRight: 5, fontSize: 14, fontFamily: Fonts.regular },
    resend: { fontSize: 14, fontFamily: Fonts.medium },
    demo: { marginTop: 30, color: Colors.textGray, fontSize: 13, textAlign: 'center', fontFamily: Fonts.regular },
    errorText: {
        color: Colors.error,
        fontSize: 14,
        marginTop: 15,
        textAlign: 'center',
        width: '100%',
        fontFamily: Fonts.medium,
    },
});
