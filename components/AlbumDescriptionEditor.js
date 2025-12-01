import React from "react";
import { ActivityIndicator, Platform, Text, TextInput, View } from "react-native";
import { Button, withTheme } from "@draftbit/ui";
import * as GlobalStyles from "../GlobalStyles";
import * as StyleSheet from "../utils/StyleSheet";

const DEFAULT_MAX_LEN = 4096;
const WARNING_THRESHOLD = 3800;

const mergeStyles = (base, override) => {
  if (!override) {
    return base;
  }
  if (Array.isArray(override)) {
    return override.reduce((acc, item) => (item ? { ...acc, ...item } : acc), { ...base });
  }
  return { ...base, ...override };
};

const AlbumDescriptionEditor = ({
  theme,
  value,
  onChangeText,
  onSave,
  saving = false,
  disabled = false,
  maxLen = DEFAULT_MAX_LEN,
  counterWarningThreshold = WARNING_THRESHOLD,
  helperText = "You can use simple Markdown (**, _ _, lists).",
  placeholder = "Add a description... (optional)",
  label = "Album Description (Markdown)",
  inputAccessibilityLabel = "Album description editor",
  inputTestID = "album-description-editor",
  style,
  textInputStyle,
  preview,
  statusText,
  statusTone = "success",
}) => {
  const safeValue = typeof value === "string" ? value : "";
  const length = safeValue.length;
  const exceedsLimit = length > maxLen;
  const showWarning = length >= counterWarningThreshold;
  const saveDisabled = disabled || saving || exceedsLimit;
  const statusColor =
    statusTone === "error"
      ? theme.colors.text.warning
      : (theme.colors.success ?? theme.colors.text.medium);
  const lastSubmittedRef = React.useRef(safeValue);
  const shouldRestoreRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof safeValue === "string" && safeValue.trim().length > 0) {
      lastSubmittedRef.current = safeValue;
    }
  }, [safeValue]);

  React.useEffect(() => {
    if (!shouldRestoreRef.current || saving) {
      return;
    }
    if (safeValue && safeValue.trim().length > 0) {
      shouldRestoreRef.current = false;
      return;
    }
    const lastValue = lastSubmittedRef.current;
    if (!lastValue || lastValue.trim().length === 0) {
      shouldRestoreRef.current = false;
      return;
    }
    shouldRestoreRef.current = false;
    onChangeText?.(lastValue);
  }, [safeValue, saving, onChangeText]);

  const handleSavePress = React.useCallback(() => {
    if (typeof onSave !== "function") {
      return;
    }
    lastSubmittedRef.current = safeValue;
    shouldRestoreRef.current = true;
    onSave();
  }, [onSave, safeValue]);

  return (
    <View
      style={mergeStyles(
        {
          backgroundColor: theme.colors.background.base,
          borderRadius: 18,
          padding: 20,
        },
        style,
      )}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
          <Text
            selectable={false}
            style={StyleSheet.compose(
              GlobalStyles.TextStyles(theme)["Text 2"].style,
              theme.typography.subtitle1,
              { color: theme.colors.text.strong },
            )}
          >
            {label}
          </Text>
          {statusText ? (
            <Text
              selectable={false}
              style={StyleSheet.compose(
                GlobalStyles.TextStyles(theme)["Text 2"].style,
                theme.typography.caption,
                {
                  color: statusColor,
                  marginLeft: 12,
                  marginTop: Platform.OS === "web" ? 2 : 0,
                },
              )}
            >
              {statusText}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {saving ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.branding.primary}
              style={{ marginRight: 12 }}
            />
          ) : null}
          <Button
            title="Save"
            onPress={handleSavePress}
            disabled={saveDisabled}
            accessibilityState={{ disabled: saveDisabled }}
            style={{
              backgroundColor: saveDisabled
                ? theme.colors.background.quaternary
                : theme.colors.branding.primary,
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 20,
              opacity: saveDisabled ? 0.7 : 1,
            }}
            textStyle={{
              color: theme.colors.background.base,
              fontFamily: "Inter_600SemiBold",
            }}
          />
        </View>
      </View>
      <TextInput
        multiline
        scrollEnabled
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.light}
        value={safeValue}
        onChangeText={onChangeText}
        maxLength={maxLen}
        accessibilityLabel={inputAccessibilityLabel}
        testID={inputTestID}
        style={mergeStyles(
          {
            backgroundColor: theme.colors.background.tertiary,
            borderColor: exceedsLimit ? theme.colors.text.warning : "#E5E5EA",
            borderRadius: 16,
            borderWidth: Platform.OS === "web" ? 1 : 0,
            color: theme.colors.text.strong,
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            lineHeight: 22,
            marginTop: 16,
            minHeight: 140,
            paddingHorizontal: 16,
            paddingVertical: 14,
            textAlignVertical: "top",
          },
          textInputStyle,
        )}
      />
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Text
          selectable={false}
          style={StyleSheet.compose(
            GlobalStyles.TextStyles(theme)["Text 2"].style,
            theme.typography.caption,
            { color: theme.colors.text.light },
          )}
        >
          {helperText}
        </Text>
        <Text
          selectable={false}
          style={StyleSheet.compose(
            GlobalStyles.TextStyles(theme)["Text 2"].style,
            theme.typography.caption,
            {
              color: exceedsLimit
                ? theme.colors.text.warning
                : showWarning
                  ? theme.colors.text.medium
                  : theme.colors.text.light,
              textAlign: "right",
              minWidth: 88,
            },
          )}
        >
          {`${length}/${maxLen}`}
        </Text>
      </View>
      {preview ? (
        <View
          style={{
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: 14,
            marginTop: 16,
            padding: 16,
          }}
        >
          {preview}
        </View>
      ) : null}
    </View>
  );
};

export default withTheme(AlbumDescriptionEditor);
