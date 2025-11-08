import * as StyleSheet from "./utils/StyleSheet";

import Breakpoints from "./utils/Breakpoints";

import palettes from "./themes/palettes";

export const ImageBackgroundStyles = (theme) =>
  StyleSheet.create({ "Image Background": { style: { flex: 1 }, props: {} } });

export const BlurViewStyles = (theme) =>
  StyleSheet.create({
    "Blur View": {
      style: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
      props: {},
    },
  });

export const DividerStyles = (theme) =>
  StyleSheet.create({ Divider: { style: { height: 1 }, props: {} } });

export const ButtonStyles = (theme) =>
  StyleSheet.create({
    Button: {
      style: {
        backgroundColor: theme.colors.branding.primary,
        borderRadius: 8,
        fontFamily: "System",
        fontWeight: "700",
        textAlign: "center",
      },
      props: {},
    },
    "Button.Accent": {
      style: {
        backgroundColor: theme.colors.branding.accent,
        borderRadius: 16,
        color: "rgb(15, 23, 42)",
        fontFamily: "System",
        fontWeight: "700",
        marginBottom: 12,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        textAlign: "center",
      },
      props: {},
    },
    "Button.Primary": {
      style: {
        backgroundColor: palettes.Socialize["primary #0A84FF"],
        borderRadius: 16,
        fontFamily: "System",
        fontWeight: "700",
        marginBottom: 12,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        textAlign: "center",
      },
      props: {},
    },
    "Button.Primary 2": {
      style: {
        backgroundColor: palettes.Socialize["primary #0A84FF"],
        borderRadius: 16,
        fontFamily: "System",
        fontWeight: "700",
        marginBottom: 12,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        textAlign: "center",
      },
      props: {},
    },
    "Button.Secondary": {
      style: {
        backgroundColor: palettes.Socialize["primary #0A84FF"],
        borderRadius: 16,
        fontFamily: "System",
        fontWeight: "700",
        marginBottom: 12,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        textAlign: "center",
      },
      props: {},
    },
  });

export const CheckboxRowStyles = (theme) =>
  StyleSheet.create({
    "Checkbox Row": { style: { minHeight: 50 }, props: {} },
  });

export const TextStyles = (theme) =>
  StyleSheet.create({
    Test: {
      style: {
        color: theme.colors.text.strong,
        fontFamily: "Inter_500Medium",
        fontSize: 18,
        marginTop: 12,
        textAlign: "center",
      },
      props: {},
    },
    Text: { style: { color: theme.colors.text.strong }, props: {} },
    "Text 2": { style: { color: theme.colors.text.strong }, props: {} },
    "Text.Headline": { style: { color: theme.colors.text.strong }, props: {} },
  });

export const LinkStyles = (theme) =>
  StyleSheet.create({
    Link: { style: { color: theme.colors.branding.primary }, props: {} },
  });

export const CircleStyles = (theme) =>
  StyleSheet.create({
    Circle: {
      style: {
        alignItems: "center",
        backgroundColor: theme.colors.branding.primary,
        justifyContent: "center",
      },
      props: {},
    },
  });

export const ImageStyles = (theme) =>
  StyleSheet.create({
    Image: { style: { height: 100, width: 100 }, props: {} },
  });

export const LinearGradientStyles = (theme) =>
  StyleSheet.create({ "Linear Gradient": { style: { flex: 1 }, props: {} } });

export const TextFieldStyles = (theme) =>
  StyleSheet.create({
    "Styled Text Area": { style: {}, props: {} },
    "Styled Text Field": { style: {}, props: {} },
  });

export const TextInputStyles = (theme) =>
  StyleSheet.create({
    "Text Input": {
      style: {
        borderBottomWidth: 1,
        borderColor: theme.colors.border.base,
        borderLeftWidth: 1,
        borderRadius: 8,
        borderRightWidth: 1,
        borderTopWidth: 1,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 8,
      },
      props: {},
    },
  });

export const FetchStyles = (theme) =>
  StyleSheet.create({ Fetch: { style: { minHeight: 40 }, props: {} } });

export const DatePickerStyles = (theme) =>
  StyleSheet.create({ "Date Picker": { style: {}, props: {} } });

export const PickerStyles = (theme) => StyleSheet.create({ Picker: { style: {}, props: {} } });

export const SurfaceStyles = (theme) =>
  StyleSheet.create({ Surface: { style: { minHeight: 40 }, props: {} } });

export const VStackStyles = (theme) =>
  StyleSheet.create({
    "V Stack": { style: { flexDirection: "column" }, props: {} },
  });

export const ExpoImageStyles = (theme) =>
  StyleSheet.create({
    "Image (default)": { style: { height: 100, width: 100 }, props: {} },
  });

export const HStackStyles = (theme) =>
  StyleSheet.create({
    "H Stack": {
      style: { alignItems: "center", flexDirection: "row" },
      props: {},
    },
  });

export const TableStyles = (theme) =>
  StyleSheet.create({ Table: { style: { flex: 1 }, props: {} } });

export const TableCellStyles = (theme) =>
  StyleSheet.create({
    "Table Cell": { style: { flex: 1, flexDirection: "row" }, props: {} },
  });
