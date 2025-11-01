import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
// Assuming you have 'Colors' defined here
import { Colors } from '../constants/Colors'; 

// Step 1: Define the props interface explicitly
interface LoadingOverlayProps {
    visible: boolean;
}

// Step 2: Use React.FC<LoadingOverlayProps> to assign the props type
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
    // Step 3: Only render if the 'visible' prop is true
    if (!visible) {
        return null;
    }
    
    return (
        <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
};

export default LoadingOverlay;

const styles = StyleSheet.create({
    overlay: {
        // Use absoluteFillObject to cover the entire container (screen)
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        // Semi-transparent white background for a clean look
        backgroundColor: 'rgba(255,255,255,0.8)', 
        // High zIndex ensures it sits above all other content
        zIndex: 9999, 
    },
});
