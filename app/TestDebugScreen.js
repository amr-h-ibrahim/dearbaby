import React from "react";
import { Button, ScreenContainer, withTheme } from "@draftbit/ui";
import { Text, View } from "react-native";
import * as GlobalStyles from "../GlobalStyles.js";
import * as SupabaseDearBaby2Api from "../apis/SupabaseDearBaby2Api.js";
import * as GlobalVariables from "../config/GlobalVariableContext";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import * as StyleSheet from "../utils/StyleSheet";
import useNavigation from "../utils/useNavigation";
import useParams from "../utils/useParams";
import useWindowDimensions from "../utils/useWindowDimensions";

const TestDebugScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const [FileName, setFileName] = React.useState("");
  const [jpegBytes, setJpegBytes] = React.useState(0);
  const [jpegUri, setJpegUri] = React.useState("");
  const [mint_debug, setMint_debug] = React.useState("");
  const [mint_debug1, setMint_debug1] = React.useState("");
  const [object_key, setObject_key] = React.useState("");
  const [putUrl, setPutUrl] = React.useState("");
  const supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST =
    SupabaseDearBaby2Api.useMintAvatarUpload$EdgeFunction$POST();

  return (
    <ScreenContainer hasSafeArea={false} scrollable={false}>
      {/* Debug */}
      <View>
        <Button
          accessible={true}
          iconPosition={"left"}
          onPress={() => {
            const handler = async () => {
              console.log("Button ON_PRESS Start");
              let error = null;
              try {
                console.log("Start ON_PRESS:0 FETCH_REQUEST");
                const APITEST = (
                  await supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST.mutateAsync({
                    bytes: 555555,
                    content_type: "image/jpeg",
                    mimeType: "image/jpeg",
                    target: "avatar",
                  })
                )?.json;
                console.log("Complete ON_PRESS:0 FETCH_REQUEST", { APITEST });
                console.log("Start ON_PRESS:1 SET_VARIABLE");
                setMint_debug(APITEST?.data?.objectKey);
                setMint_debug1("TEST-1");
                console.log("Complete ON_PRESS:1 SET_VARIABLE");
              } catch (err) {
                console.error(err);
                error = err.message ?? err;
              }
              console.log("Button ON_PRESS Complete", error ? { error } : "no error");
            };
            handler();
          }}
          {...GlobalStyles.ButtonStyles(theme)["Button"].props}
          style={StyleSheet.applyWidth(
            StyleSheet.compose(
              GlobalStyles.ButtonStyles(theme)["Button"].style,
              theme.typography.button,
              {},
            ),
            dimensions.width,
          )}
          title={"TEST "}
        />
        {/* mint_debug */}
        <Text
          accessible={true}
          selectable={false}
          {...GlobalStyles.TextStyles(theme)["Text 2"].props}
          style={StyleSheet.applyWidth(
            StyleSheet.compose(
              GlobalStyles.TextStyles(theme)["Text 2"].style,
              theme.typography.body1,
              {},
            ),
            dimensions.width,
          )}
        >
          {"mint_debug: "}
          {mint_debug}
        </Text>
        {/* mint_debug 2 */}
        <Text
          accessible={true}
          selectable={false}
          {...GlobalStyles.TextStyles(theme)["Text 2"].props}
          style={StyleSheet.applyWidth(
            StyleSheet.compose(
              GlobalStyles.TextStyles(theme)["Text 2"].style,
              theme.typography.body1,
              {},
            ),
            dimensions.width,
          )}
        >
          {"mint_debug: "}
          {mint_debug1}
        </Text>
      </View>
    </ScreenContainer>
  );
};

export default withTheme(TestDebugScreen);
