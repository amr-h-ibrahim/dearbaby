import React from "react";
import {
  ExpoImage,
  Icon,
  ScreenContainer,
  SimpleStyleFlatList,
  SimpleStyleScrollView,
  Surface,
  Table,
  TableCell,
  TableRow,
  TextField,
  Touchable,
  withTheme,
} from "@draftbit/ui";
import { ActivityIndicator, ImageBackground, RefreshControl, Text, View } from "react-native";
import { Fetch } from "react-request";
import * as GlobalStyles from "../GlobalStyles.js";
import * as RestAPIExampleDataApi from "../apis/RestAPIExampleDataApi.js";
import * as SupabaseDearBaby2Api from "../apis/SupabaseDearBaby2Api.js";
import * as SupabaseDearBabyApi from "../apis/SupabaseDearBabyApi.js";
import * as GlobalVariables from "../config/GlobalVariableContext";
import Images from "../config/Images";
import convert_to_JPEG from "../global-functions/convert_to_JPEG";
import get_file_size_bytes_xplat from "../global-functions/get_file_size_bytes_xplat";
import prepare_jpeg_and_size from "../global-functions/prepare_jpeg_and_size";
import prewarm_media_pipeline from "../global-functions/prewarm_media_pipeline";
import put_to_signed_url_xplat from "../global-functions/put_to_signed_url_xplat";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import * as StyleSheet from "../utils/StyleSheet";
import imageSource from "../utils/imageSource";
import openImagePickerUtil from "../utils/openImagePicker";
import useIsFocused from "../utils/useIsFocused";
import useNavigation from "../utils/useNavigation";
import useParams from "../utils/useParams";
import useWindowDimensions from "../utils/useWindowDimensions";

const ProfileScreen = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const [FileName, setFileName] = React.useState("");
  const [MyName, setMyName] = React.useState("");
  const [Profile_Image, setProfile_Image] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [avatar_object_key, setAvatar_object_key] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [debug_step, setDebug_step] = React.useState("");
  const [display_name, setDisplay_name] = React.useState("");
  const [jpegBytes, setJpegBytes] = React.useState(0);
  const [jpegUri, setJpegUri] = React.useState("");
  const [mint_debug, setMint_debug] = React.useState("ttttt");
  const [mint_debug1, setMint_debug1] = React.useState("");
  const [object_key, setObject_key] = React.useState("");
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [putUrl, setPutUrl] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [
    refreshingScrollViewUserDetailsCurrentUserEmail,
    setRefreshingScrollViewUserDetailsCurrentUserEmail,
  ] = React.useState(false);
  const supabaseDearBabyMintViewPOST = SupabaseDearBabyApi.useMintViewPOST();
  const supabaseDearBaby2MintAvatarUpload$EdgeFunction$POST =
    SupabaseDearBaby2Api.useMintAvatarUpload$EdgeFunction$POST();
  const supabaseDearBabyPATCHProfilePATCH = SupabaseDearBabyApi.usePATCHProfilePATCH();
  const supabaseDearBabyMintAvatarView$EdgeFunction$POST =
    SupabaseDearBabyApi.useMintAvatarView$EdgeFunction$POST();
  React.useEffect(() => {
    const handler = async () => {
      try {
        await prewarm_media_pipeline();
      } catch (err) {
        console.error(err);
      }
    };
    handler();
  }, []);
  const isFocused = useIsFocused();
  React.useEffect(() => {
    const handler = async () => {
      try {
        if (!isFocused) {
          return;
        }
        const profileResp = (await SupabaseDearBabyApi.getProfileGET(Constants, {}))?.json;
        setAvatar_object_key(profileResp && profileResp[0]?.avatar_object_key);
        const viewResp = (
          await supabaseDearBabyMintViewPOST.mutateAsync({
            object_key: profileResp && profileResp[0]?.avatar_object_key,
          })
        )?.json;
        setAvatarUrl(viewResp?.url);
      } catch (err) {
        console.error(err);
      }
    };
    handler();
  }, [isFocused]);

  return (
    <ScreenContainer hasSafeArea={false} scrollable={false} hasTopSafeArea={true}>
      {/* Header */}
      <View
        style={StyleSheet.applyWidth(
          { height: 48, marginLeft: 20, marginTop: 12 },
          dimensions.width,
        )}
      >
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: theme.colors.text.strong,
              fontFamily: "Inter_500Medium",
              fontSize: 24,
            },
            dimensions.width,
          )}
        >
          {"Profile"}
        </Text>
      </View>
      {/* debug_step */}
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
        {"Debug: "}
        {debug_step}
      </Text>

      <SimpleStyleScrollView
        bounces={true}
        horizontal={false}
        keyboardShouldPersistTaps={"never"}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        style={StyleSheet.applyWidth(
          { flex: 1, marginBottom: 20, paddingBottom: 25 },
          dimensions.width,
        )}
      >
        {/* User Details */}
        <View
          style={StyleSheet.applyWidth(
            { flex: 1, justifyContent: "center", minHeight: 200 },
            dimensions.width,
          )}
        >
          {/* Photo */}
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
                      mediaTypes: "Images",
                      allowsEditing: true,
                      quality: 1,
                      allowsMultipleSelection: false,
                      selectionLimit: 0,
                      outputBase64: true,
                    });
                    console.log("Complete ON_PRESS:0 OPEN_IMAGE_PICKER", {
                      picker,
                    });
                    console.log("Start ON_PRESS:1 SET_VARIABLE");
                    const response = picker;
                    setProfile_Image(response);
                    console.log("Complete ON_PRESS:1 SET_VARIABLE");
                    console.log("Start ON_PRESS:2 SET_VARIABLE");
                    setDebug_step("START*****");
                    console.log("Complete ON_PRESS:2 SET_VARIABLE");
                    console.log("Start ON_PRESS:3 CUSTOM_FUNCTION");
                    /* hidden 'Run a Custom Function' action */ console.log(
                      "Complete ON_PRESS:3 CUSTOM_FUNCTION",
                    );
                    console.log("Start ON_PRESS:4 CUSTOM_FUNCTION");
                    const prep = await prepare_jpeg_and_size(picker, 512, 0.82);
                    console.log("Complete ON_PRESS:4 CUSTOM_FUNCTION", {
                      prep,
                    });
                    console.log("Start ON_PRESS:5 SET_VARIABLE");
                    /* hidden 'Set Variable' action */ console.log(
                      "Complete ON_PRESS:5 SET_VARIABLE",
                    );
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
                    console.log("Complete ON_PRESS:9 FETCH_REQUEST", {
                      mintResp,
                    });
                    console.log("Start ON_PRESS:10 SET_VARIABLE");
                    /* hidden 'Set Variable' action */ console.log(
                      "Complete ON_PRESS:10 SET_VARIABLE",
                    );
                    console.log("Start ON_PRESS:11 SET_VARIABLE");
                    setObject_key(mintResp?.data?.objectKey);
                    console.log("Complete ON_PRESS:11 SET_VARIABLE");
                    console.log("Start ON_PRESS:12 SET_VARIABLE");
                    setPutUrl(mintResp?.data?.uploadUrl);
                    console.log("Complete ON_PRESS:12 SET_VARIABLE");
                    console.log("Start ON_PRESS:13 CUSTOM_FUNCTION");
                    await put_to_signed_url_xplat(mintResp?.data?.uploadUrl, jpegUri);
                    console.log("Complete ON_PRESS:13 CUSTOM_FUNCTION");
                    console.log("Start ON_PRESS:14 SET_VARIABLE");
                    setDebug_step("after-put");
                    console.log("Complete ON_PRESS:14 SET_VARIABLE");
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
                    console.log("Complete ON_PRESS:15 FETCH_REQUEST", {
                      patchResp,
                    });
                    console.log("Start ON_PRESS:16 SET_VARIABLE");
                    setDebug_step("after-patch");
                    console.log("Complete ON_PRESS:16 SET_VARIABLE");
                    console.log("Start ON_PRESS:17 SET_VARIABLE");
                    setDebug_step("Before mint avatar view");
                    console.log("Complete ON_PRESS:17 SET_VARIABLE");
                    console.log("Start ON_PRESS:18 FETCH_REQUEST");
                    /* hidden 'API Request' action */ console.log(
                      "Complete ON_PRESS:18 FETCH_REQUEST",
                    );
                    console.log("Start ON_PRESS:19 SET_VARIABLE");
                    setDebug_step("after-mint-view");
                    console.log("Complete ON_PRESS:19 SET_VARIABLE");
                    console.log("Start ON_PRESS:20 SET_VARIABLE");
                    setAvatar_object_key(patchResp && patchResp[0]?.avatar_object_key);
                    console.log("Complete ON_PRESS:20 SET_VARIABLE");
                    console.log("Start ON_PRESS:21 SET_VARIABLE");
                    setDebug_step(avatar_object_key);
                    console.log("Complete ON_PRESS:21 SET_VARIABLE");
                    console.log("Start ON_PRESS:22 SET_VARIABLE");
                    setAvatarUrl("");
                    console.log("Complete ON_PRESS:22 SET_VARIABLE");
                    console.log("Start ON_PRESS:23 SET_VARIABLE");
                    setDebug_step(avatarUrl);
                    console.log("Complete ON_PRESS:23 SET_VARIABLE");
                    console.log("Start ON_PRESS:24 SET_VARIABLE");
                    setDebug_step("After mint-view");
                    console.log("Complete ON_PRESS:24 SET_VARIABLE");
                    console.log("Start ON_PRESS:25 FETCH_REQUEST");
                    const viewResp = (
                      await supabaseDearBabyMintViewPOST.mutateAsync({
                        object_key: patchResp && patchResp[0]?.avatar_object_key,
                      })
                    )?.json;
                    console.log("Complete ON_PRESS:25 FETCH_REQUEST", {
                      viewResp,
                    });
                    console.log("Start ON_PRESS:26 SET_VARIABLE");
                    setAvatarUrl(viewResp?.url);
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
              disabledOpacity={0.8}
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
          {/* Fetch Name */}
          <SupabaseDearBabyApi.FetchGetProfileGET>
            {({ loading, error, data, refetchGetProfile }) => {
              const fetchNameData = data?.json;
              if (loading) {
                return <ActivityIndicator />;
              }

              if (error || data?.status < 200 || data?.status >= 300) {
                return <ActivityIndicator />;
              }

              return (
                <>
                  {/* Display Name */}
                  <Text
                    accessible={true}
                    selectable={false}
                    {...GlobalStyles.TextStyles(theme)["Test"].props}
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(
                        GlobalStyles.TextStyles(theme)["Test"].style,
                        theme.typography.body1,
                        {},
                      ),
                      dimensions.width,
                    )}
                  >
                    {fetchNameData?.[0]?.display_name}
                    {"\n"}
                    {fetchNameData?.[0]?.Phone}
                  </Text>
                </>
              );
            }}
          </SupabaseDearBabyApi.FetchGetProfileGET>
          {/* Current User */}
          <SupabaseDearBabyApi.FetchGetCurrentUserGET>
            {({ loading, error, data, refetchGetCurrentUser }) => {
              const currentUserData = data?.json;
              if (loading) {
                return <ActivityIndicator />;
              }

              if (error || data?.status < 200 || data?.status >= 300) {
                return <ActivityIndicator />;
              }

              return (
                <>
                  {/* Email */}
                  <SimpleStyleFlatList
                    data={currentUserData?.identities}
                    decelerationRate={"normal"}
                    horizontal={false}
                    inverted={false}
                    keyExtractor={(emailData, index) => emailData?.id}
                    keyboardShouldPersistTaps={"never"}
                    listKey={"Scroll View->User Details->Current User->Email"}
                    nestedScrollEnabled={false}
                    numColumns={1}
                    onEndReachedThreshold={0.5}
                    pagingEnabled={false}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshingScrollViewUserDetailsCurrentUserEmail}
                        onRefresh={() => {
                          try {
                            setRefreshingScrollViewUserDetailsCurrentUserEmail(true);
                            /* 'Set Variable' action requires configuration: choose a variable */ setRefreshingScrollViewUserDetailsCurrentUserEmail(
                              false,
                            );
                          } catch (err) {
                            console.error(err);
                            setRefreshingScrollViewUserDetailsCurrentUserEmail(false);
                          }
                        }}
                      />
                    }
                    renderItem={({ item, index }) => {
                      const emailData = item;
                      return (
                        <Text
                          accessible={true}
                          selectable={false}
                          {...GlobalStyles.TextStyles(theme)["Test"].props}
                          style={StyleSheet.applyWidth(
                            StyleSheet.compose(
                              GlobalStyles.TextStyles(theme)["Test"].style,
                              theme.typography.body1,
                              {},
                            ),
                            dimensions.width,
                          )}
                        >
                          {emailData?.identity_data?.email}
                        </Text>
                      );
                    }}
                    showsHorizontalScrollIndicator={true}
                    showsVerticalScrollIndicator={true}
                    snapToAlignment={"start"}
                  />
                </>
              );
            }}
          </SupabaseDearBabyApi.FetchGetCurrentUserGET>
          {/* ID */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: theme.colors.text.strong,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 4,
                opacity: 0.6,
                textAlign: "center",
              },
              dimensions.width,
            )}
          >
            {"081732123912"}
          </Text>
          {/* ParentProfileScreen */}
          <View>
            <Text
              accessible={true}
              selectable={false}
              {...GlobalStyles.TextStyles(theme)["Text 2"].props}
              style={StyleSheet.applyWidth(
                StyleSheet.compose(
                  GlobalStyles.TextStyles(theme)["Text 2"].style,
                  theme.typography.body1,
                  { color: theme.colors.text.danger },
                ),
                dimensions.width,
              )}
            >
              {"\nProfile Details \n"}
            </Text>

            <SupabaseDearBabyApi.FetchGetProfileGET>
              {({ loading, error, data, refetchGetProfile }) => {
                const fetchData = data?.json;
                if (loading) {
                  return <ActivityIndicator />;
                }

                if (error || data?.status < 200 || data?.status >= 300) {
                  return <ActivityIndicator />;
                }

                return (
                  <>
                    {/* Display Name */}
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
                      {"Name: "}
                      {fetchData?.[0]?.display_name}
                    </Text>

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
                      {"Bio:"}
                    </Text>
                    <TextField
                      autoCapitalize={"none"}
                      autoCorrect={true}
                      changeTextDelay={500}
                      multiline={true}
                      numberOfLines={4}
                      placeholder={
                        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book."
                      }
                      type={"solid"}
                      webShowOutline={true}
                      {...GlobalStyles.TextFieldStyles(theme)["Styled Text Area"].props}
                      defaultValue={fetchData?.[0]?.bio}
                      style={StyleSheet.applyWidth(
                        StyleSheet.compose(
                          GlobalStyles.TextFieldStyles(theme)["Styled Text Area"].style,
                          theme.typography.body2,
                          { position: "relative" },
                        ),
                        dimensions.width,
                      )}
                    />
                  </>
                );
              }}
            </SupabaseDearBabyApi.FetchGetProfileGET>
          </View>
        </View>
        {/* Partner */}
        <View
          style={StyleSheet.applyWidth(
            {
              borderColor: palettes.App.Peoplebit_Light_Gray,
              borderTopWidth: 2,
              flexGrow: 0,
              flexShrink: 0,
              paddingLeft: 16,
              paddingRight: 16,
            },
            dimensions.width,
          )}
        >
          {/* Partner */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App.Peoplebit_Salmon_Red,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                letterSpacing: 1.2,
                marginBottom: 8,
                marginTop: 14,
                textTransform: "uppercase",
              },
              dimensions.width,
            )}
          >
            {"My Lifetime Partner"}
          </Text>
        </View>
        {/* Partner Details */}
        <SimpleStyleScrollView
          bounces={true}
          horizontal={false}
          keyboardShouldPersistTaps={"never"}
          nestedScrollEnabled={false}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
          style={StyleSheet.applyWidth({ paddingLeft: 16, paddingRight: 16 }, dimensions.width)}
        >
          <RestAPIExampleDataApi.FetchTodosGET>
            {({ loading, error, data, refetchTodos }) => {
              const fetchData = data?.json;
              if (loading) {
                return <ActivityIndicator />;
              }

              if (error || data?.status < 200 || data?.status >= 300) {
                return <ActivityIndicator />;
              }

              return (
                <SimpleStyleFlatList
                  data={fetchData}
                  decelerationRate={"normal"}
                  horizontal={false}
                  inverted={false}
                  keyExtractor={(listData, index) =>
                    listData?.id ?? listData?.uuid ?? index?.toString() ?? JSON.stringify(listData)
                  }
                  keyboardShouldPersistTaps={"never"}
                  listKey={"Scroll View->Partner Details->Fetch->List"}
                  nestedScrollEnabled={false}
                  numColumns={1}
                  onEndReachedThreshold={0.5}
                  pagingEnabled={false}
                  renderItem={({ item, index }) => {
                    const listData = item;
                    return (
                      <Touchable>
                        {/* Surface Elevation 10 */}
                        <Surface
                          elevation={3}
                          style={StyleSheet.applyWidth(
                            {
                              backgroundColor: palettes.App.Peoplebit_White,
                              borderColor: theme.colors.border.brand,
                              borderLeftWidth: 1,
                              borderRadius: 10,
                              marginBottom: 12,
                              overflow: "hidden",
                            },
                            dimensions.width,
                          )}
                        >
                          {/* Meeting Record */}
                          <View
                            style={StyleSheet.applyWidth(
                              { flexDirection: "row" },
                              dimensions.width,
                            )}
                          >
                            {/* Card Info Wrapper */}
                            <View
                              style={StyleSheet.applyWidth(
                                {
                                  flexShrink: 1,
                                  paddingBottom: 8,
                                  paddingLeft: 8,
                                  paddingRight: 8,
                                  paddingTop: 8,
                                  width: "100%",
                                },
                                dimensions.width,
                              )}
                            >
                              {/* Meeting Date Time ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Salmon_Red,
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 10,
                                    paddingBottom: 6,
                                  },
                                  dimensions.width,
                                )}
                              >
                                {listData?.completed_on}
                              </Text>
                              {/* Meeting Name ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Dark_Emerald_Green,
                                    fontFamily: "Inter_600SemiBold",
                                    fontSize: 18,
                                    marginBottom: 3,
                                    textTransform: "capitalize",
                                  },
                                  dimensions.width,
                                )}
                              >
                                {listData?.title}
                              </Text>
                              {/* Details ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Earthy_Brown,
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 12,
                                    marginTop: 2,
                                  },
                                  dimensions.width,
                                )}
                              >
                                {"Level of effort measurements for the new idea. "}
                              </Text>
                            </View>
                            {/* Card Image Wrapper */}
                            <View>
                              {/* Card Image Asset */}
                              <ImageBackground
                                resizeMode={"cover"}
                                source={imageSource("https://picsum.photos/100")}
                                style={StyleSheet.applyWidth(
                                  { height: 100, width: 100 },
                                  dimensions.width,
                                )}
                              />
                            </View>
                          </View>
                        </Surface>
                      </Touchable>
                    );
                  }}
                  showsHorizontalScrollIndicator={true}
                  showsVerticalScrollIndicator={true}
                  snapToAlignment={"start"}
                  style={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}
                />
              );
            }}
          </RestAPIExampleDataApi.FetchTodosGET>
        </SimpleStyleScrollView>
        {/* Babies */}
        <View
          style={StyleSheet.applyWidth(
            {
              borderColor: palettes.App.Peoplebit_Light_Gray,
              borderTopWidth: 2,
              flexGrow: 0,
              flexShrink: 0,
              paddingLeft: 16,
              paddingRight: 16,
            },
            dimensions.width,
          )}
        >
          {/* Babies */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: palettes.App.Peoplebit_Salmon_Red,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                letterSpacing: 1.2,
                marginBottom: 8,
                marginTop: 14,
                textTransform: "uppercase",
              },
              dimensions.width,
            )}
          >
            {"My Dear Baby"}
          </Text>
        </View>
        {/* Baby list */}
        <SimpleStyleScrollView
          bounces={true}
          horizontal={false}
          keyboardShouldPersistTaps={"never"}
          nestedScrollEnabled={false}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
          style={StyleSheet.applyWidth({ paddingLeft: 16, paddingRight: 16 }, dimensions.width)}
        >
          <RestAPIExampleDataApi.FetchTodosGET>
            {({ loading, error, data, refetchTodos }) => {
              const fetchData = data?.json;
              if (loading) {
                return <ActivityIndicator />;
              }

              if (error || data?.status < 200 || data?.status >= 300) {
                return <ActivityIndicator />;
              }

              return (
                <SimpleStyleFlatList
                  data={fetchData}
                  decelerationRate={"normal"}
                  horizontal={false}
                  inverted={false}
                  keyExtractor={(listData, index) =>
                    listData?.id ?? listData?.uuid ?? index?.toString() ?? JSON.stringify(listData)
                  }
                  keyboardShouldPersistTaps={"never"}
                  listKey={"Scroll View->Baby list->Fetch->List"}
                  nestedScrollEnabled={false}
                  numColumns={1}
                  onEndReachedThreshold={0.5}
                  pagingEnabled={false}
                  renderItem={({ item, index }) => {
                    const listData = item;
                    return (
                      <Touchable>
                        {/* Surface Elevation 10 */}
                        <Surface
                          elevation={3}
                          style={StyleSheet.applyWidth(
                            {
                              backgroundColor: palettes.App.Peoplebit_White,
                              borderColor: theme.colors.border.brand,
                              borderLeftWidth: 1,
                              borderRadius: 10,
                              marginBottom: 12,
                              overflow: "hidden",
                            },
                            dimensions.width,
                          )}
                        >
                          {/* Meeting Record */}
                          <View
                            style={StyleSheet.applyWidth(
                              { flexDirection: "row" },
                              dimensions.width,
                            )}
                          >
                            {/* Card Info Wrapper */}
                            <View
                              style={StyleSheet.applyWidth(
                                {
                                  flexShrink: 1,
                                  paddingBottom: 8,
                                  paddingLeft: 8,
                                  paddingRight: 8,
                                  paddingTop: 8,
                                  width: "100%",
                                },
                                dimensions.width,
                              )}
                            >
                              {/* Meeting Date Time ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Salmon_Red,
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 10,
                                    paddingBottom: 6,
                                  },
                                  dimensions.width,
                                )}
                              >
                                {listData?.completed_on}
                              </Text>
                              {/* Meeting Name ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Dark_Emerald_Green,
                                    fontFamily: "Inter_600SemiBold",
                                    fontSize: 18,
                                    marginBottom: 3,
                                    textTransform: "capitalize",
                                  },
                                  dimensions.width,
                                )}
                              >
                                {listData?.title}
                              </Text>
                              {/* Details ~ */}
                              <Text
                                accessible={true}
                                selectable={false}
                                style={StyleSheet.applyWidth(
                                  {
                                    color: palettes.App.Peoplebit_Earthy_Brown,
                                    fontFamily: "Inter_400Regular",
                                    fontSize: 12,
                                    marginTop: 2,
                                  },
                                  dimensions.width,
                                )}
                              >
                                {"Level of effort measurements for the new idea. "}
                              </Text>
                            </View>
                            {/* Card Image Wrapper */}
                            <View>
                              {/* Card Image Asset */}
                              <ImageBackground
                                resizeMode={"cover"}
                                source={imageSource("https://picsum.photos/100")}
                                style={StyleSheet.applyWidth(
                                  { height: 100, width: 100 },
                                  dimensions.width,
                                )}
                              />
                            </View>
                          </View>
                        </Surface>
                      </Touchable>
                    );
                  }}
                  showsHorizontalScrollIndicator={true}
                  showsVerticalScrollIndicator={true}
                  snapToAlignment={"start"}
                  style={StyleSheet.applyWidth({ flex: 1 }, dimensions.width)}
                />
              );
            }}
          </RestAPIExampleDataApi.FetchTodosGET>
        </SimpleStyleScrollView>
        {/* Menu */}
        <View
          style={StyleSheet.applyWidth(
            {
              backgroundColor: palettes.App["Custom #ffffff"],
              borderRadius: 12,
              marginBottom: 20,
              marginLeft: 20,
              marginRight: 20,
              paddingBottom: 10,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
            },
            dimensions.width,
          )}
        >
          {/* Location */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"Ionicons/location-outline"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Location"}
              </Text>
            </View>
          </Touchable>
          {/* Payment */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"Ionicons/wallet-outline"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Payment"}
              </Text>
            </View>
          </Touchable>
          {/* Privacy */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"MaterialCommunityIcons/security"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Privacy Policy"}
              </Text>
            </View>
          </Touchable>
          {/* Terms and Conditions */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"Entypo/text-document"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Term And Conditions"}
              </Text>
            </View>
          </Touchable>
          {/* Contact Us */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"AntDesign/contacts"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Contact Us"}
              </Text>
            </View>
          </Touchable>
          {/* Logout */}
          <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
            <View
              style={StyleSheet.applyWidth(
                { alignItems: "center", flexDirection: "row", height: 60 },
                dimensions.width,
              )}
            >
              <Icon
                size={24}
                color={theme.colors.text.strong}
                name={"AntDesign/logout"}
                style={StyleSheet.applyWidth({ opacity: 0.6 }, dimensions.width)}
              />
              <Text
                accessible={true}
                selectable={false}
                style={StyleSheet.applyWidth(
                  {
                    color: theme.colors.text.strong,
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    marginLeft: 10,
                    opacity: 0.8,
                  },
                  dimensions.width,
                )}
              >
                {"Logout"}
              </Text>
            </View>
          </Touchable>
        </View>
      </SimpleStyleScrollView>
      {/* Bottom Tab */}
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: "center",
            backgroundColor: palettes.App["Custom #ffffff"],
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            flexDirection: "row",
            height: 117,
            justifyContent: "space-between",
            paddingBottom: 20,
            paddingLeft: 30,
            paddingRight: 30,
          },
          dimensions.width,
        )}
      >
        {/* Home */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.text.medium} name={"AntDesign/home"} />
          </View>
        </Touchable>
        {/* History Transaction */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon
              size={24}
              color={theme.colors.text.medium}
              name={"Ionicons/document-text-outline"}
            />
          </View>
        </Touchable>
        {/* Messages */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.text.medium} name={"Ionicons/chatbox-outline"} />
          </View>
        </Touchable>
        {/* Profile */}
        <Touchable activeOpacity={0.8} disabledOpacity={0.8}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: "center",
                height: 48,
                justifyContent: "center",
                width: 48,
              },
              dimensions.width,
            )}
          >
            <Icon size={24} color={theme.colors.branding.primary} name={"FontAwesome/user"} />
          </View>
        </Touchable>
      </View>
    </ScreenContainer>
  );
};

export default withTheme(ProfileScreen);
