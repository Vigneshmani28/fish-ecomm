import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Step = 'phone' | 'otp' | 'name';

export default function LoginScreen() {
    const { signInWithOtp, verifyOtp, updateProfile, setIsNewUser } = useAuth();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [userName, setUserName] = useState('');

    const otpRefs = useRef<(TextInput | null)[]>([]);
    const nameInputRef = useRef<TextInput | null>(null);

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');

    const inputBg = useThemeColor(
        { light: '#F4F6F8', dark: '#1E2022' },
        'background'
    );
    const inputBorder = useThemeColor(
        { light: '#E0E4E8', dark: '#2C2F33' },
        'background'
    );

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const fullPhone = `+91${phone.replace(/\s/g, '')}`;

    const handleSendOtp = async () => {
        const cleaned = phone.replace(/\s/g, '');
        if (cleaned.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
            return;
        }
        setLoading(true);
        const { error } = await signInWithOtp(fullPhone);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error);
            return;
        }

        setStep('otp');
        setCountdown(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits entered
        if (value && index === 5) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === 6) {
                handleVerifyOtp(fullOtp);
            }
        }
    };

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        const { error, isNew } = await verifyOtp(fullPhone, code);
        setLoading(false);

        if (error) {
            Alert.alert('Verification Failed', error);
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
            return;
        }

        // If new user (no name set), show the name step
        if (isNew) {
            setStep('name');
            setTimeout(() => nameInputRef.current?.focus(), 300);
        }
        // Otherwise, auth state change will navigate automatically
    };

    const handleSaveName = async () => {
        const trimmedName = userName.trim();
        if (!trimmedName) {
            Alert.alert('Enter Your Name', 'Please enter your name to continue.');
            return;
        }
        setLoading(true);
        const { error } = await updateProfile({ name: trimmedName });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error);
            return;
        }

        // Mark as no longer new — auth state will navigate to tabs
        setIsNewUser(false);
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setLoading(true);
        const { error } = await signInWithOtp(fullPhone);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error);
            return;
        }
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
    };

    const getHeaderTitle = () => {
        switch (step) {
            case 'phone': return 'Welcome to FishApp';
            case 'otp': return 'Verify OTP';
            case 'name': return 'Almost There!';
        }
    };

    const getHeaderSubtitle = () => {
        switch (step) {
            case 'phone': return 'Enter your phone number to continue';
            case 'otp': return `We sent a 6-digit code to +91 ${phone}`;
            case 'name': return 'Tell us your name to get started';
        }
    };

    return (
        <ThemedView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.logoCircle, { backgroundColor: tintColor }]}>
                            <Ionicons name={step === 'name' ? 'person' : 'fish'} size={40} color="#fff" />
                        </View>
                        <ThemedText type="title" style={styles.title}>
                            {getHeaderTitle()}
                        </ThemedText>
                        <ThemedText style={[styles.subtitle, { color: iconColor }]}>
                            {getHeaderSubtitle()}
                        </ThemedText>
                    </View>

                    {step === 'phone' ? (
                        /* Phone Number Input */
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <ThemedText type="defaultSemiBold" style={styles.label}>
                                    Phone Number
                                </ThemedText>
                                <View
                                    style={[
                                        styles.phoneInputWrapper,
                                        { backgroundColor: inputBg, borderColor: inputBorder },
                                    ]}
                                >
                                    <View style={[styles.countryCode, { borderRightColor: inputBorder }]}>
                                        <ThemedText type="defaultSemiBold" style={styles.countryCodeText}>
                                            🇮🇳 +91
                                        </ThemedText>
                                    </View>
                                    <TextInput
                                        style={[styles.phoneInput, { color: textColor }]}
                                        placeholder="Enter 10-digit number"
                                        placeholderTextColor={iconColor}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: tintColor },
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleSendOtp}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <ThemedText
                                            type="defaultSemiBold"
                                            style={styles.buttonText}
                                            lightColor="#fff"
                                            darkColor="#000"
                                        >
                                            Send OTP
                                        </ThemedText>
                                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : step === 'otp' ? (
                        /* OTP Verification */
                        <View style={styles.form}>
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => { otpRefs.current[index] = ref; }}
                                        style={[
                                            styles.otpInput,
                                            {
                                                backgroundColor: inputBg,
                                                borderColor: digit ? tintColor : inputBorder,
                                                color: textColor,
                                            },
                                        ]}
                                        value={digit}
                                        onChangeText={(v) => handleOtpChange(v, index)}
                                        onKeyPress={({ nativeEvent }) =>
                                            handleOtpKeyPress(nativeEvent.key, index)
                                        }
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: tintColor },
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={() => handleVerifyOtp()}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <ThemedText
                                        type="defaultSemiBold"
                                        style={styles.buttonText}
                                        lightColor="#fff"
                                        darkColor="#000"
                                    >
                                        Verify & Continue
                                    </ThemedText>
                                )}
                            </TouchableOpacity>

                            {/* Resend */}
                            <View style={styles.resendRow}>
                                <ThemedText style={{ color: iconColor }}>
                                    Didn't receive the code?{' '}
                                </ThemedText>
                                <TouchableOpacity
                                    onPress={handleResend}
                                    disabled={countdown > 0}
                                >
                                    <ThemedText
                                        type="defaultSemiBold"
                                        style={{
                                            color: countdown > 0 ? iconColor : tintColor,
                                        }}
                                    >
                                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>

                            {/* Change number */}
                            <TouchableOpacity
                                style={styles.changeNumber}
                                onPress={() => {
                                    setStep('phone');
                                    setOtp(['', '', '', '', '', '']);
                                }}
                            >
                                <Ionicons name="arrow-back" size={16} color={tintColor} />
                                <ThemedText
                                    type="defaultSemiBold"
                                    style={{ color: tintColor, fontSize: 14 }}
                                >
                                    Change Phone Number
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Name Collection Step */
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <ThemedText type="defaultSemiBold" style={styles.label}>
                                    Your Name
                                </ThemedText>
                                <View
                                    style={[
                                        styles.nameInputWrapper,
                                        { backgroundColor: inputBg, borderColor: inputBorder },
                                    ]}
                                >
                                    <Ionicons name="person-outline" size={20} color={iconColor} style={{ marginLeft: 14 }} />
                                    <TextInput
                                        ref={nameInputRef}
                                        style={[styles.nameStepInput, { color: textColor }]}
                                        placeholder="Enter your full name"
                                        placeholderTextColor={iconColor}
                                        value={userName}
                                        onChangeText={setUserName}
                                        autoCapitalize="words"
                                        autoFocus
                                        onSubmitEditing={handleSaveName}
                                        returnKeyType="done"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: tintColor },
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleSaveName}
                                activeOpacity={0.85}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <ThemedText
                                            type="defaultSemiBold"
                                            style={styles.buttonText}
                                            lightColor="#fff"
                                            darkColor="#000"
                                        >
                                            Get Started
                                        </ThemedText>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 8,
    },
    title: {
        marginBottom: 8,
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        marginLeft: 4,
    },
    phoneInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        height: 56,
        overflow: 'hidden',
    },
    countryCode: {
        paddingHorizontal: 14,
        height: '100%',
        justifyContent: 'center',
        borderRightWidth: 1,
    },
    countryCodeText: {
        fontSize: 15,
    },
    phoneInput: {
        flex: 1,
        fontSize: 17,
        paddingHorizontal: 14,
        height: '100%',
        letterSpacing: 1,
    },
    nameInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        height: 56,
        overflow: 'hidden',
    },
    nameStepInput: {
        flex: 1,
        fontSize: 17,
        paddingHorizontal: 14,
        height: '100%',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginVertical: 10,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 1.5,
        borderRadius: 14,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
    },
    button: {
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 17,
    },
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    changeNumber: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
    },
});
