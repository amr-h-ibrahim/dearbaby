import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Button, ScreenContainer, useTheme } from "@draftbit/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as GlobalVariables from "../../config/GlobalVariableContext";
import * as SupabaseDearBabyApi from "../../apis/SupabaseDearBabyApi";
import useNavigation from "../../utils/useNavigation";
import useParams from "../../utils/useParams";
import palettes from "../../themes/palettes";

export default function InviteAcceptScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleGoToProfile = () => {
    navigation.navigate("ProfileScreen");
  };

  return (
    <ScreenContainer
      hasSafeArea={true}
      scrollable={false}
      hasTopSafeArea={true}
      style={styles.screenContainer}
    >
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.colors.text.strong }]}>Welcome! 💛</Text>
        <Text style={[styles.message, { color: theme.colors.text.medium }]}>
          To join a baby's world, please sign in. You'll see invitations waiting on your profile.
        </Text>
        <TouchableOpacity onPress={handleGoToProfile} style={styles.blueButton} activeOpacity={0.8}>
          <Text style={styles.blueButtonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    maxWidth: 480,
    width: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: "Inter_400Regular",
  },
  button: {
    width: "100%",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  blueButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#0A84FF",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  blueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
