import React from "react";
import {
  ExpoImage,
  SimpleStyleScrollView,
  Table,
  TableCell,
  TableRow,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { Text, View } from "react-native";
import * as GlobalStyles from "../GlobalStyles.js";
import * as SupabaseDearBaby2Api from "../apis/SupabaseDearBaby2Api.js";
import * as SupabaseDearBabyApi from "../apis/SupabaseDearBabyApi.js";
import useMintView from "../apis/useMintView";
import * as GlobalVariables from "../config/GlobalVariableContext";
import Images from "../config/Images";
import convert_to_JPEG from "../global-functions/convert_to_JPEG";
import get_file_size_bytes_xplat from "../global-functions/get_file_size_bytes_xplat";
import prepare_jpeg_and_size from "../global-functions/prepare_jpeg_and_size";
import put_to_signed_url_xplat from "../global-functions/put_to_signed_url_xplat";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import * as StyleSheet from "../utils/StyleSheet";
import imageSource from "../utils/imageSource";
import openImagePickerUtil from "../utils/openImagePicker";
import useNavigation from "../utils/useNavigation";
import useWindowDimensions from "../utils/useWindowDimensions";
import { resolveStorageUrl } from "../utils/storageUrlHelpers";

const AvatarBlock = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const [FileName, setFileName] = React.useState("");
  const [Profile_Image, setProfile_Image] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [avatar_object_key, setAvatar_object_key] = React.useState("");
  const [jpegBytes, setJpegBytes] = React.useState(0);
  const [jpegUri, setJpegUri] = React.useState("");
  const [mint_debug, setMint_debug] = React.useState("");
  const [object_key, setObject_key] = React.useState("");
  const [putUrl, setPutUrl] = React.useState("");
  const supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST =
    SupabaseDearBaby2Api.useMintAvatarUpload$EdgeFunction$POST();
  const supabaseDearBabyPATCHProfilePATCH = SupabaseDearBabyApi.usePATCHProfilePATCH();
  const supabaseDearBabyMintAvatarView$EdgeFunction$POST =
    SupabaseDearBabyApi.useMintAvatarView$EdgeFunction$POST();
  const { mutateAsync: mintViewAsync } = useMintView();

  return (
    <View style={StyleSheet.applyWidth({ alignItems: "center" }, dimensions.width)}>
      <ExpoImage
        allowDownscaling={true}
        cachePolicy={"disk"}
        contentPosition={"center"}
        resizeMode={"cover"}
        transitionDuration={300}
        transitionEffect={"cross-dissolve"}
        transitionTiming={"ease-in-out"}
        source={imageSource(`${avatarUrl}`)}
        style={StyleSheet.applyWidth(
          {
            borderRadius: 60,
            height: 110,
            position: "absolute",
            top: 5,
            width: 110,
          },
          dimensions.width,
        )}
      />
      <Touchable
        onPress={() => {
          const handler = async () => {
            console.log("Touchable ON_PRESS Start");
            let error = null;
            try {
              console.log("Start ON_PRESS:0 OPEN_IMAGE_PICKER");
              const picker = await openImagePickerUtil({
                mediaTypes: "images",
                allowsEditing: true,
                quality: 1,
                allowsMultipleSelection: false,
                selectionLimit: 0,
                outputBase64: true,
              });
              console.log("Complete ON_PRESS:0 OPEN_IMAGE_PICKER", { picker });
              console.log("Start ON_PRESS:1 SET_VARIABLE");
              const response = picker;
              setProfile_Image(response);
              console.log("Complete ON_PRESS:1 SET_VARIABLE");
              console.log("Start ON_PRESS:3 CUSTOM_FUNCTION");
              /* hidden 'Run a Custom Function' action */ console.log(
                "Complete ON_PRESS:3 CUSTOM_FUNCTION",
              );
              console.log("Start ON_PRESS:4 CUSTOM_FUNCTION");
              const prep = await prepare_jpeg_and_size(picker, 512, 0.82);
              console.log("Complete ON_PRESS:4 CUSTOM_FUNCTION", { prep });
              console.log("Start ON_PRESS:5 SET_VARIABLE");
              /* hidden 'Set Variable' action */ console.log("Complete ON_PRESS:5 SET_VARIABLE");
              console.log("Start ON_PRESS:6 SET_VARIABLE");
              setJpegUri(prep?.uri);
              console.log("Complete ON_PRESS:6 SET_VARIABLE");
              console.log("Start ON_PRESS:7 CUSTOM_FUNCTION");
              /* hidden 'Run a Custom Function' action */ console.log(
                "Complete ON_PRESS:7 CUSTOM_FUNCTION",
              );
              console.log("Start ON_PRESS:8 SET_VARIABLE");
              setJpegBytes(prep?.bytes);
              console.log("Complete ON_PRESS:8 SET_VARIABLE");
              console.log("Start ON_PRESS:9 FETCH_REQUEST");
              const mintResp = (
                await supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST.mutateAsync({
                  bytes: jpegBytes,
                  content_type: "image/jpeg",
                  mimeType: "image/jpeg",
                  target: "avatar",
                })
              )?.json;
              console.log("Complete ON_PRESS:9 FETCH_REQUEST", { mintResp });
              console.log("Start ON_PRESS:10 SET_VARIABLE");
              /* hidden 'Set Variable' action */ console.log("Complete ON_PRESS:10 SET_VARIABLE");
              console.log("Start ON_PRESS:11 SET_VARIABLE");
              setObject_key(mintResp?.data?.objectKey);
              console.log("Complete ON_PRESS:11 SET_VARIABLE");
              console.log("Start ON_PRESS:12 SET_VARIABLE");
              setPutUrl(mintResp?.data?.uploadUrl);
              console.log("Complete ON_PRESS:12 SET_VARIABLE");
              console.log("Start ON_PRESS:13 CUSTOM_FUNCTION");
              await put_to_signed_url_xplat(mintResp?.data?.uploadUrl, jpegUri);
              console.log("Complete ON_PRESS:13 CUSTOM_FUNCTION");
              console.log("Start ON_PRESS:15 FETCH_REQUEST");
              const patchResp = (
                await supabaseDearBabyPATCHProfilePATCH.mutateAsync({
                  bio: "Hello HELOO",
                  display_name: "Amora",
                  object_key: mintResp?.data?.objectKey,
                  timezone: "Asia/Dubai",
                  user_id: "d051eea3-e42e-4cf9-9fb7-6db65aaf5e32",
                })
              )?.json;
              console.log("Complete ON_PRESS:15 FETCH_REQUEST", { patchResp });
              console.log("Start ON_PRESS:18 FETCH_REQUEST");
              /* hidden 'API Request' action */ console.log("Complete ON_PRESS:18 FETCH_REQUEST");
              console.log("Start ON_PRESS:20 SET_VARIABLE");
              setAvatar_object_key(patchResp && patchResp[0]?.avatar_object_key);
              console.log("Complete ON_PRESS:20 SET_VARIABLE");
              console.log("Start ON_PRESS:22 SET_VARIABLE");
              setAvatarUrl("");
              console.log("Complete ON_PRESS:22 SET_VARIABLE");
              console.log("Start ON_PRESS:25 FETCH_REQUEST");
              const viewResp = await mintViewAsync({
                objectKey: patchResp && patchResp[0]?.avatar_object_key,
              });
              console.log("Complete ON_PRESS:25 FETCH_REQUEST", { viewResp });
              console.log("Start ON_PRESS:26 SET_VARIABLE");
              const mintedUrl = resolveStorageUrl(viewResp);
              setAvatarUrl(mintedUrl ?? "");
              console.log("Complete ON_PRESS:26 SET_VARIABLE");
            } catch (err) {
              console.error(err);
              error = err.message ?? err;
            }
            console.log("Touchable ON_PRESS Complete", error ? { error } : "no error");
          };
          handler();
        }}
        activeOpacity={0.8}
      >
        <ExpoImage
          allowDownscaling={true}
          cachePolicy={"disk"}
          contentPosition={"center"}
          resizeMode={"cover"}
          transitionDuration={300}
          transitionEffect={"cross-dissolve"}
          transitionTiming={"ease-in-out"}
          source={imageSource(Images["EditPicFrame"])}
          style={StyleSheet.applyWidth({ height: 137, width: 120 }, dimensions.width)}
        />
      </Touchable>

      <SimpleStyleScrollView
        bounces={true}
        horizontal={false}
        keyboardShouldPersistTaps={"never"}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
      >
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
          {"USER_ID: "}
          {Constants["user_id"]}
          {"\navatar_object_key : "}
          {avatar_object_key}
          {"\navatarUrl: "}
          {avatarUrl}
        </Text>

        <Table
          borderColor={theme.colors.border.base}
          borderStyle={"solid"}
          borderWidth={1}
          cellHorizontalPadding={10}
          cellVerticalPadding={10}
          drawBottomBorder={false}
          drawEndBorder={false}
          drawStartBorder={false}
          drawTopBorder={true}
          showsVerticalScrollIndicator={true}
          {...GlobalStyles.TableStyles(theme)["Table"].props}
          style={StyleSheet.applyWidth(
            GlobalStyles.TableStyles(theme)["Table"].style,
            dimensions.width,
          )}
        >
          <TableRow
            drawBottomBorder={true}
            drawEndBorder={false}
            drawStartBorder={true}
            drawTopBorder={false}
            isTableHeader={false}
          >
            <TableCell
              drawBottomBorder={false}
              drawEndBorder={true}
              drawStartBorder={false}
              drawTopBorder={false}
              {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
              style={StyleSheet.applyWidth(
                GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                dimensions.width,
              )}
            >
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
                {"FileName: "}
              </Text>
            </TableCell>
          </TableRow>
          {/* Table Row 2 */}
          <TableRow
            drawBottomBorder={true}
            drawEndBorder={false}
            drawStartBorder={true}
            drawTopBorder={false}
            isTableHeader={false}
          >
            <TableCell
              drawBottomBorder={false}
              drawEndBorder={true}
              drawStartBorder={false}
              drawTopBorder={false}
              {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
              style={StyleSheet.applyWidth(
                GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                dimensions.width,
              )}
            >
              {/* Text 2 */}
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
                {"jpegUri: \n"}
                {jpegUri}
              </Text>
            </TableCell>
          </TableRow>
          {/* Table Row 3 */}
          <TableRow
            drawBottomBorder={true}
            drawEndBorder={false}
            drawStartBorder={true}
            drawTopBorder={false}
            isTableHeader={true}
          >
            <TableCell
              drawBottomBorder={false}
              drawEndBorder={true}
              drawStartBorder={false}
              drawTopBorder={false}
              {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
              style={StyleSheet.applyWidth(
                GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                dimensions.width,
              )}
            >
              {/* Text 3 */}
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
                {"jpegBytes: "}
                {jpegBytes}
                {"\nobject_key: "}
                {object_key}
                {"\n"}
              </Text>
            </TableCell>
          </TableRow>
          {/* Table Row 4 */}
          <TableRow
            drawBottomBorder={true}
            drawEndBorder={false}
            drawStartBorder={true}
            drawTopBorder={false}
            isTableHeader={false}
          >
            <TableCell
              drawBottomBorder={false}
              drawEndBorder={true}
              drawStartBorder={false}
              drawTopBorder={false}
              {...GlobalStyles.TableCellStyles(theme)["Table Cell"].props}
              style={StyleSheet.applyWidth(
                GlobalStyles.TableCellStyles(theme)["Table Cell"].style,
                dimensions.width,
              )}
            >
              {/* Text 3 */}
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
                {"putUrl: "}
                {putUrl}
              </Text>
            </TableCell>
          </TableRow>
        </Table>
      </SimpleStyleScrollView>
    </View>
  );
};

export default withTheme(AvatarBlock);
