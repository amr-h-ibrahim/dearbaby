import React from 'react';
import {
  Button,
  CheckboxRow,
  Divider,
  ExpoImage,
  Icon,
  ScreenContainer,
  TextInput,
  Touchable,
  withTheme,
} from '@draftbit/ui';
import { Image, Text, View } from 'react-native';
import * as GlobalStyles from '../../GlobalStyles.js';
import * as SupabaseDearBabyApi from '../../apis/SupabaseDearBabyApi.js';
import * as GlobalVariables from '../../config/GlobalVariableContext';
import Images from '../../config/Images';
import palettes from '../../themes/palettes';
import Breakpoints from '../../utils/Breakpoints';
import * as StyleSheet from '../../utils/StyleSheet';
import imageSource from '../../utils/imageSource';
import useNavigation from '../../utils/useNavigation';
import useParams from '../../utils/useParams';
import useWindowDimensions from '../../utils/useWindowDimensions';

const LoginScreen = props => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const [checkboxRowValue, setCheckboxRowValue] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [textInput2Value, setTextInput2Value] = React.useState('');
  const [textInputValue, setTextInputValue] = React.useState('');

  return (
    <ScreenContainer scrollable={false} hasSafeArea={true}>
      <View
        style={StyleSheet.applyWidth(
          {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'space-evenly',
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 20,
          },
          dimensions.width
        )}
      >
        {/* Logo */}
        <ExpoImage
          allowDownscaling={true}
          cachePolicy={'disk'}
          contentPosition={'center'}
          resizeMode={'cover'}
          transitionDuration={300}
          transitionEffect={'cross-dissolve'}
          transitionTiming={'ease-in-out'}
          source={imageSource(Images['BigLogo'])}
          style={StyleSheet.applyWidth(
            { height: 120, width: 120 },
            dimensions.width
          )}
        />
        {/* Login to Your Account */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: theme.colors.text.strong,
              fontFamily: 'Inter_700Bold',
              fontSize: 28,
            },
            dimensions.width
          )}
        >
          {'Login to Your Account'}
        </Text>
        {/* Error Message */}
        <>
          {!errorMessage ? null : (
            <Text
              accessible={true}
              selectable={false}
              {...GlobalStyles.TextStyles(theme)['Text 2'].props}
              style={StyleSheet.applyWidth(
                StyleSheet.compose(
                  GlobalStyles.TextStyles(theme)['Text 2'].style,
                  theme.typography.body1,
                  {
                    color: theme.colors.text.danger,
                    fontFamily: 'System',
                    fontSize: 20,
                    fontWeight: '700',
                    textAlign: 'center',
                  }
                ),
                dimensions.width
              )}
            >
              {errorMessage}
            </Text>
          )}
        </>
        {/* Email */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: 'center',
              backgroundColor: palettes.App['BG Gray'],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: 'row',
              height: 60,
              justifyContent: 'space-between',
              paddingLeft: 20,
              paddingRight: 20,
              width: '100%',
            },
            dimensions.width
          )}
        >
          <Icon
            size={24}
            color={palettes.App['Custom Color_20']}
            name={'MaterialCommunityIcons/email'}
          />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width
            )}
          >
            <TextInput
              autoCapitalize={'none'}
              autoCorrect={true}
              changeTextDelay={500}
              onChangeText={newTextInputValue => {
                try {
                  setTextInputValue(newTextInputValue);
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={'Email'}
              placeholderTextColor={palettes.App['Custom Color_20']}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width
              )}
              value={textInputValue}
            />
          </View>
        </View>
        {/* Password */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: 'center',
              backgroundColor: palettes.App['BG Gray'],
              borderBottomWidth: 1,
              borderColor: theme.colors.border.brand,
              borderLeftWidth: 1,
              borderRadius: 16,
              borderRightWidth: 1,
              borderTopWidth: 1,
              flexDirection: 'row',
              height: 60,
              justifyContent: 'space-between',
              paddingLeft: 20,
              paddingRight: 20,
              width: '100%',
            },
            dimensions.width
          )}
        >
          <Icon
            size={24}
            color={palettes.App['Custom Color_20']}
            name={'FontAwesome/lock'}
          />
          <View
            style={StyleSheet.applyWidth(
              { flex: 1, paddingLeft: 10, paddingRight: 10 },
              dimensions.width
            )}
          >
            <TextInput
              autoCapitalize={'none'}
              autoCorrect={true}
              changeTextDelay={500}
              onChangeText={newTextInputValue => {
                try {
                  setPasswordInput(newTextInputValue);
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={'Password'}
              placeholderTextColor={palettes.App['Custom Color_20']}
              secureTextEntry={true}
              style={StyleSheet.applyWidth(
                {
                  borderRadius: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 8,
                },
                dimensions.width
              )}
              value={passwordInput}
            />
          </View>
          <Icon
            size={24}
            color={palettes.App['Custom Color_20']}
            name={'Ionicons/eye-off'}
          />
        </View>
        {/* Remember me */}
        <View style={StyleSheet.applyWidth({ width: 160 }, dimensions.width)}>
          <CheckboxRow
            onPress={newCheckboxRowValue => {
              try {
                setCheckboxRowValue(newCheckboxRowValue);
              } catch (err) {
                console.error(err);
              }
            }}
            direction={'row-reverse'}
            label={'Remember me'}
            style={StyleSheet.applyWidth({ minHeight: 50 }, dimensions.width)}
          />
        </View>
        {/* Sign in */}
        <Button
          accessible={true}
          iconPosition={'left'}
          onPress={() => {
            const handler = async () => {
              try {
                const loginResponse = (
                  await SupabaseDearBabyApi.loginPOST(Constants, {
                    email: textInputValue,
                    password: passwordInput,
                  })
                )?.json;
                if (loginResponse?.access_token) {
                  const AUTHORIZATION_HEADER = (
                    'Bearer ' + (loginResponse?.access_token).trim()
                  ).trim();
                  await setGlobalVariableValue({
                    key: 'AUTHORIZATION_HEADER',
                    value: AUTHORIZATION_HEADER,
                  });

                  const refresh_token = loginResponse?.refresh_token;
                  await setGlobalVariableValue({
                    key: 'refresh_token',
                    value: refresh_token,
                  });

                  const auth_token = loginResponse?.access_token;
                  await setGlobalVariableValue({
                    key: 'auth_token',
                    value: auth_token,
                  });

                  const auth_token2 = Constants['apiKey'];
                  await setGlobalVariableValue({
                    key: 'apiKey',
                    value: auth_token2,
                  });
                  await setGlobalVariableValue({
                    key: 'user_id',
                    value:
                      (loginResponse?.user?.identities?.[0]?.user_id).trim(),
                  });
                  await setGlobalVariableValue({
                    key: 'AUTHORIZATION_HEADER',
                    value: 'Bearer ' + loginResponse?.access_token,
                  });
                  navigation.navigate('ProfileScreen', {});
                } else {
                  setErrorMessage('Invalid email or password');
                }
              } catch (err) {
                console.error(err);
              }
            };
            handler();
          }}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: theme.colors.branding.primary,
              borderRadius: 100,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              height: 58,
              textAlign: 'center',
              width: '100%',
            },
            dimensions.width
          )}
          title={'Sign in'}
        />
        {/* Forgot Password */}
        <Touchable
          style={StyleSheet.applyWidth({ width: '100%' }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                paddingBottom: 10,
                paddingTop: 10,
              },
              dimensions.width
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: palettes.App['Custom Color'],
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  marginLeft: 10,
                },
                dimensions.width
              )}
            >
              {'Forgot Password?'}
            </Text>
          </View>
        </Touchable>
        {/* or continue with */}
        <View
          style={StyleSheet.applyWidth(
            {
              alignItems: 'center',
              flexDirection: 'row',
              height: 45,
              justifyContent: 'space-between',
              width: '100%',
            },
            dimensions.width
          )}
        >
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth(
              { height: 2, width: '20%' },
              dimensions.width
            )}
          />
          {/* OR */}
          <Text
            accessible={true}
            selectable={false}
            style={StyleSheet.applyWidth(
              {
                color: theme.colors.text.strong,
                fontFamily: 'Inter_500Medium',
                fontSize: 16,
                marginLeft: 20,
                marginRight: 20,
                opacity: 0.7,
              },
              dimensions.width
            )}
          >
            {'or continue with'}
          </Text>
          <Divider
            color={theme.colors.border.base}
            style={StyleSheet.applyWidth(
              { height: 2, width: '20%' },
              dimensions.width
            )}
          />
        </View>
        {/* Social options */}
        <View
          style={StyleSheet.applyWidth(
            {
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              width: '100%',
            },
            dimensions.width
          )}
        >
          {/* Facebook */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: 'row',
                  height: 60,
                  justifyContent: 'center',
                  width: 88,
                },
                dimensions.width
              )}
            >
              <ExpoImage
                allowDownscaling={true}
                cachePolicy={'disk'}
                contentPosition={'center'}
                resizeMode={'cover'}
                transitionDuration={300}
                transitionEffect={'cross-dissolve'}
                transitionTiming={'ease-in-out'}
                source={imageSource(Images['ObFB'])}
                style={StyleSheet.applyWidth(
                  { height: 24, width: 24 },
                  dimensions.width
                )}
              />
            </View>
          </Touchable>
          {/* Google */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: 'row',
                  height: 60,
                  justifyContent: 'center',
                  width: 88,
                },
                dimensions.width
              )}
            >
              <ExpoImage
                allowDownscaling={true}
                cachePolicy={'disk'}
                contentPosition={'center'}
                resizeMode={'cover'}
                transitionDuration={300}
                transitionEffect={'cross-dissolve'}
                transitionTiming={'ease-in-out'}
                source={imageSource(Images['ObGoogle'])}
                style={StyleSheet.applyWidth(
                  { height: 24, width: 24 },
                  dimensions.width
                )}
              />
            </View>
          </Touchable>
          {/* Apple */}
          <Touchable>
            <View
              style={StyleSheet.applyWidth(
                {
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderColor: theme.colors.border.brand,
                  borderLeftWidth: 2,
                  borderRadius: 16,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  flexDirection: 'row',
                  height: 60,
                  justifyContent: 'center',
                  width: 88,
                },
                dimensions.width
              )}
            >
              <Image
                resizeMode={'cover'}
                source={imageSource(Images['ObApple'])}
                style={StyleSheet.applyWidth(
                  { height: 24, width: 24 },
                  dimensions.width
                )}
              />
            </View>
          </Touchable>
        </View>
        {/* Sign up */}
        <Touchable
          style={StyleSheet.applyWidth({ width: '100%' }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                paddingBottom: 10,
                paddingTop: 10,
              },
              dimensions.width
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: palettes.App['Custom Color_20'],
                  fontFamily: 'Inter_400Regular',
                },
                dimensions.width
              )}
            >
              {'Don’t have an account?'}
            </Text>

            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: palettes.App['Custom Color'],
                  fontFamily: 'Inter_500Medium',
                  marginLeft: 7,
                },
                dimensions.width
              )}
            >
              {'Sign up'}
            </Text>
          </View>
        </Touchable>
      </View>
    </ScreenContainer>
  );
};

export default withTheme(LoginScreen);
