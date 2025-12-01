import React from 'react';
import {
  Button,
  DatePicker,
  Divider,
  ExpoImage,
  LoadingIndicator,
  Picker,
  ScreenContainer,
  SimpleStyleFlatList,
  SimpleStyleScrollView,
  Spacer,
  Surface,
  TextField,
  withTheme,
} from '@draftbit/ui';
import { ActivityIndicator, Platform, RefreshControl, Text, View } from 'react-native';
import { Fetch } from 'react-request';
import * as GlobalStyles from '../../../GlobalStyles.js';
import * as SupabaseDearBabyApi from '../../../apis/SupabaseDearBabyApi.js';
import AvatarBlock from '../../../components/AvatarBlock';
import * as GlobalVariables from '../../../config/GlobalVariableContext';
import palettes from '../../../themes/palettes';
import Breakpoints from '../../../utils/Breakpoints';
import * as StyleSheet from '../../../utils/StyleSheet';
import imageSource from '../../../utils/imageSource';
import openImagePickerUtil from '../../../utils/openImagePicker';
import useIsFocused from '../../../utils/useIsFocused';
import useNavigation from '../../../utils/useNavigation';
import useParams from '../../../utils/useParams';
import useWindowDimensions from '../../../utils/useWindowDimensions';
import { useRequireAuth } from '../../../utils/useAuthState';

const defaultProps = { Name: '' };

const HomeScreen = props => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  useRequireAuth();
  const params = useParams();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const [API_Authorization_Header, setAPI_Authorization_Header] =
    React.useState('');
  const [BabyName, setBabyName] = React.useState('');
  const [Bio, setBio] = React.useState('');
  const [Multiple_Images, setMultiple_Images] = React.useState([]);
  const [MyName, setMyName] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [datePickerValue, setDatePickerValue] = React.useState(new Date());
  const [emailInputValue, setEmailInputValue] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [image, setImage] = React.useState('');
  const [passwordInputValue, setPasswordInputValue] = React.useState('');
  const [pickerValue, setPickerValue] = React.useState('');
  const [retypepassword, setRetypepassword] = React.useState('');
  const [styledTextAreaValue, setStyledTextAreaValue] = React.useState('');
  const [styledTextAreaValue2, setStyledTextAreaValue2] = React.useState('');
  const [styledTextFieldValue, setStyledTextFieldValue] = React.useState('');
  const [textInputValue, setTextInputValue] = React.useState('');
  const [textFieldValue, setTextFieldValue] = React.useState('');
  const [
    refreshingScrollViewSurfaceViewWhoAmICurrentUserEmail,
    setRefreshingScrollViewSurfaceViewWhoAmICurrentUserEmail,
  ] = React.useState(false);
  const supabaseDearBabyBabiesCreatePOST =
    SupabaseDearBabyApi.useBabiesCreatePOST();

  return (
    <ScreenContainer hasSafeArea={false} scrollable={false}>
      <Divider
        color={theme.colors.border.base}
        {...GlobalStyles.DividerStyles(theme)['Divider'].props}
        style={StyleSheet.applyWidth(
          GlobalStyles.DividerStyles(theme)['Divider'].style,
          dimensions.width
        )}
      />
      <SimpleStyleScrollView
        bounces={true}
        horizontal={false}
        keyboardShouldPersistTaps={'never'}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        style={StyleSheet.applyWidth(
          { alignItems: 'center', justifyContent: 'flex-start' },
          dimensions.width
        )}
      >
        <Surface
          elevation={0}
          {...GlobalStyles.SurfaceStyles(theme)['Surface'].props}
          style={StyleSheet.applyWidth(
            GlobalStyles.SurfaceStyles(theme)['Surface'].style,
            dimensions.width
          )}
        >
          <View>
            {/* Who am I */}
            <View>
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
                        decelerationRate={'normal'}
                        horizontal={false}
                        inverted={false}
                        keyExtractor={(emailData, index) => emailData?.id}
                        keyboardShouldPersistTaps={'never'}
                        listKey={
                          'Scroll View->Surface->View->Who am I->Current User->Email'
                        }
                        nestedScrollEnabled={false}
                        numColumns={1}
                        onEndReachedThreshold={0.5}
                        pagingEnabled={false}
                        refreshControl={
                          Platform.OS === 'web'
                            ? undefined
                            : (
                                <RefreshControl
                                  refreshing={
                                    refreshingScrollViewSurfaceViewWhoAmICurrentUserEmail
                                  }
                                  onRefresh={() => {
                                    try {
                                      setRefreshingScrollViewSurfaceViewWhoAmICurrentUserEmail(
                                        true
                                      );
                                      /* 'Set Variable' action requires configuration: choose a variable */ setRefreshingScrollViewSurfaceViewWhoAmICurrentUserEmail(
                                        false
                                      );
                                    } catch (err) {
                                      console.error(err);
                                      setRefreshingScrollViewSurfaceViewWhoAmICurrentUserEmail(
                                        false
                                      );
                                    }
                                  }}
                                />
                              )
                        }
                        renderItem={({ item, index }) => {
                          const emailData = item;
                          return (
                            <>
                              <Text
                                accessible={true}
                                selectable={false}
                                {...GlobalStyles.TextStyles(theme)['Text 2']
                                  .props}
                                style={StyleSheet.applyWidth(
                                  StyleSheet.compose(
                                    GlobalStyles.TextStyles(theme)['Text 2']
                                      .style,
                                    theme.typography.body1,
                                    {}
                                  ),
                                  dimensions.width
                                )}
                              >
                                {"User's Email: "}
                                {emailData?.identity_data?.email}
                                {'\nUID: '}
                                {emailData?.user_id}
                              </Text>
                              {/* Text 2 */}
                              <Text
                                accessible={true}
                                selectable={false}
                                {...GlobalStyles.TextStyles(theme)['Text 2']
                                  .props}
                                style={StyleSheet.applyWidth(
                                  StyleSheet.compose(
                                    GlobalStyles.TextStyles(theme)['Text 2']
                                      .style,
                                    theme.typography.body1,
                                    {}
                                  ),
                                  dimensions.width
                                )}
                              >
                                {'JWT: '}
                                {Constants['AUTHORIZATION_HEADER']}
                              </Text>
                            </>
                          );
                        }}
                        showsHorizontalScrollIndicator={true}
                        showsVerticalScrollIndicator={true}
                        snapToAlignment={'start'}
                      />
                    </>
                  );
                }}
              </SupabaseDearBabyApi.FetchGetCurrentUserGET>
            </View>
          </View>
        </Surface>
        <Spacer left={8} right={8} bottom={10} top={10} />
        {/* List of Babies */}
        <SimpleStyleScrollView
          bounces={true}
          horizontal={false}
          keyboardShouldPersistTaps={'never'}
          nestedScrollEnabled={false}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
        >
          {/* FetchBabies */}
          <SupabaseDearBabyApi.FetchBabiesListGET retry={true}>
            {({ loading, error, data, refetchBabiesList }) => {
              const fetchBabiesData = data?.json;
              if (loading) {
                return <ActivityIndicator />;
              }

              if (error || data?.status < 200 || data?.status >= 300) {
                return <ActivityIndicator />;
              }

              return (
                <>
                  <SimpleStyleFlatList
                    data={fetchBabiesData}
                    decelerationRate={'normal'}
                    horizontal={false}
                    inverted={false}
                    keyExtractor={(listData, index) => listData?.baby_id}
                    keyboardShouldPersistTaps={'never'}
                    listKey={'Scroll View->List of Babies->FetchBabies->List'}
                    nestedScrollEnabled={false}
                    onEndReachedThreshold={0.5}
                    pagingEnabled={false}
                    renderItem={({ item, index }) => {
                      const listData = item;
                      return (
                        <>
                          <Text
                            accessible={true}
                            selectable={false}
                            {...GlobalStyles.TextStyles(theme)['Text 2'].props}
                            style={StyleSheet.applyWidth(
                              StyleSheet.compose(
                                GlobalStyles.TextStyles(theme)['Text 2'].style,
                                theme.typography.body1,
                                {
                                  alignSelf: 'center',
                                  flex: 10,
                                  margin: 8,
                                  textAlign: 'center',
                                  textTransform: 'capitalize',
                                }
                              ),
                              dimensions.width
                            )}
                          >
                            {'Name: '}
                            {listData?.name}
                          </Text>
                          {/* Text 2 */}
                          <Text
                            accessible={true}
                            selectable={false}
                            {...GlobalStyles.TextStyles(theme)['Text 2'].props}
                            style={StyleSheet.applyWidth(
                              StyleSheet.compose(
                                GlobalStyles.TextStyles(theme)['Text 2'].style,
                                theme.typography.body1,
                                { alignSelf: 'center' }
                              ),
                              dimensions.width
                            )}
                          >
                            {'Date Of Birth: '}
                            {listData?.date_of_birth}
                          </Text>
                        </>
                      );
                    }}
                    showsHorizontalScrollIndicator={true}
                    showsVerticalScrollIndicator={true}
                    snapToAlignment={'start'}
                    numColumns={fetchBabiesData}
                  />
                </>
              );
            }}
          </SupabaseDearBabyApi.FetchBabiesListGET>
        </SimpleStyleScrollView>
        {/* ParentProfileScreen */}
        <View>
          <Text
            accessible={true}
            selectable={false}
            {...GlobalStyles.TextStyles(theme)['Text 2'].props}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.TextStyles(theme)['Text 2'].style,
                theme.typography.body1,
                { color: theme.colors.text.danger }
              ),
              dimensions.width
            )}
          >
            {'\nProfile Details \n'}
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
                    {...GlobalStyles.TextStyles(theme)['Text 2'].props}
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(
                        GlobalStyles.TextStyles(theme)['Text 2'].style,
                        theme.typography.body1,
                        {}
                      ),
                      dimensions.width
                    )}
                  >
                    {'Name: '}
                    {fetchData?.[0]?.display_name}
                  </Text>

                  <Text
                    accessible={true}
                    selectable={false}
                    {...GlobalStyles.TextStyles(theme)['Text 2'].props}
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(
                        GlobalStyles.TextStyles(theme)['Text 2'].style,
                        theme.typography.body1,
                        {}
                      ),
                      dimensions.width
                    )}
                  >
                    {'Bio:'}
                  </Text>
                  <TextField
                    autoCapitalize={'none'}
                    autoCorrect={true}
                    changeTextDelay={500}
                    multiline={true}
                    numberOfLines={4}
                    placeholder={
                      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book."
                    }
                    type={'solid'}
                    webShowOutline={true}
                    {...GlobalStyles.TextFieldStyles(theme)['Styled Text Area']
                      .props}
                    defaultValue={fetchData?.[0]?.bio}
                    style={StyleSheet.applyWidth(
                      StyleSheet.compose(
                        GlobalStyles.TextFieldStyles(theme)['Styled Text Area']
                          .style,
                        theme.typography.body2,
                        { position: 'relative' }
                      ),
                      dimensions.width
                    )}
                  />
                </>
              );
            }}
          </SupabaseDearBabyApi.FetchGetProfileGET>
        </View>
        {/* Upload Multiple Images */}
        <View
          style={StyleSheet.applyWidth(
            { position: 'relative' },
            dimensions.width
          )}
        >
          <SimpleStyleFlatList
            data={Multiple_Images}
            decelerationRate={'normal'}
            horizontal={false}
            inverted={false}
            keyExtractor={(listData, index) =>
              listData?.id ??
              listData?.uuid ??
              index?.toString() ??
              JSON.stringify(listData)
            }
            keyboardShouldPersistTaps={'never'}
            listKey={'Scroll View->Upload Multiple Images->List'}
            nestedScrollEnabled={false}
            numColumns={1}
            onEndReachedThreshold={0.5}
            pagingEnabled={false}
            renderItem={({ item, index }) => {
              const listData = item;
              return (
                <ExpoImage
                  allowDownscaling={true}
                  cachePolicy={'disk'}
                  transitionDuration={300}
                  transitionEffect={'cross-dissolve'}
                  transitionTiming={'ease-in-out'}
                  {...GlobalStyles.ExpoImageStyles(theme)['Image (default)']
                    .props}
                  contentPosition={'center'}
                  contentFit={'center'}
                  source={imageSource(`${listData}`)}
                  style={StyleSheet.applyWidth(
                    StyleSheet.compose(
                      GlobalStyles.ExpoImageStyles(theme)['Image (default)']
                        .style,
                      { position: 'relative' }
                    ),
                    dimensions.width
                  )}
                />
              );
            }}
            showsHorizontalScrollIndicator={true}
            showsVerticalScrollIndicator={true}
            snapToAlignment={'start'}
            style={StyleSheet.applyWidth(
              { position: 'relative' },
              dimensions.width
            )}
          />
        </View>
        {/* Upload One Image */}
        <View
          style={StyleSheet.applyWidth(
            { position: 'relative' },
            dimensions.width
          )}
        >
          <ExpoImage
            allowDownscaling={true}
            cachePolicy={'disk'}
            transitionDuration={300}
            transitionEffect={'cross-dissolve'}
            transitionTiming={'ease-in-out'}
            {...GlobalStyles.ExpoImageStyles(theme)['Image (default)'].props}
            contentPosition={'center'}
            resizeMode={'center'}
            source={imageSource(`${image}`)}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.ExpoImageStyles(theme)['Image (default)'].style,
                { left: 150, position: 'relative' }
              ),
              dimensions.width
            )}
          />
          {/* Upload Image */}
          <Button
            accessible={true}
            iconPosition={'left'}
            onPress={() => {
              const handler = async () => {
                try {
                  const response = await openImagePickerUtil({
                    mediaTypes: 'images',
                    allowsEditing: true,
                    quality: 1,
                    allowsMultipleSelection: false,
                    selectionLimit: 0,
                    outputBase64: true,
                  });

                  setImage(response);
                } catch (err) {
                  console.error(err);
                }
              };
              handler();
            }}
            {...GlobalStyles.ButtonStyles(theme)['Button'].props}
            activeOpacity={30}
            disabledOpacity={30}
            icon={'FontAwesome/picture-o'}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.ButtonStyles(theme)['Button'].style,
                theme.typography.button,
                { left: 100, right: 50 }
              ),
              dimensions.width
            )}
            title={'Upload Photo'}
          />
          {/* Save */}
          <Button
            accessible={true}
            iconPosition={'left'}
            {...GlobalStyles.ButtonStyles(theme)['Button'].props}
            style={StyleSheet.applyWidth(
              StyleSheet.compose(
                GlobalStyles.ButtonStyles(theme)['Button'].style,
                theme.typography.button,
                {}
              ),
              dimensions.width
            )}
            title={'Save'}
          />
        </View>
      </SimpleStyleScrollView>
      <AvatarBlock />
    </ScreenContainer>
  );
};

export default withTheme(HomeScreen);
