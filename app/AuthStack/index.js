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
import { Image, Linking, Platform, Text, View } from 'react-native';
import * as GlobalStyles from '../../GlobalStyles.js';
import * as SupabaseDearBabyApi from '../../apis/SupabaseDearBabyApi.js';
import * as GlobalVariables from '../../config/GlobalVariableContext';
import Images from '../../config/Images';
import palettes from '../../themes/palettes';
import Breakpoints from '../../utils/Breakpoints';
import * as StyleSheet from '../../utils/StyleSheet';
import imageSource from '../../utils/imageSource';
import useNavigation from '../../utils/useNavigation';
import useWindowDimensions from '../../utils/useWindowDimensions';
import { useQueryClient } from 'react-query';
import { parseSupabaseAuthFromHash, clearHashFromUrl } from '../../utils/supabaseOAuthHash';

const LoginScreen = props => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  const setGlobalVariableValue = GlobalVariables.useSetValue();
  const queryClient = useQueryClient();
  const savedEmail = Constants?.saved_email ?? '';
  const savedPassword = Constants?.saved_password ?? '';
  const shouldRemember = Boolean(Constants?.remember_me);
  const [checkboxRowValue, setCheckboxRowValue] =
    React.useState(shouldRemember);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState(
    shouldRemember ? savedPassword : ''
  );
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [textInput2Value, setTextInput2Value] = React.useState('');
  const [textInputValue, setTextInputValue] = React.useState(
    shouldRemember ? savedEmail : ''
  );
  const rememberMeChecked = Boolean(checkboxRowValue);

  console.log('LoginScreen rendering...');
  console.log('Theme:', theme);
  console.log('Dimensions:', dimensions);

  // Handle Supabase OAuth redirect hash on mount (web only)
  React.useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') {
      return;
    }

    // Step A: Parse the hash
    const oauthResult = parseSupabaseAuthFromHash();

    // Step B: Guard - if no token, do nothing
    if (!oauthResult) {
      console.log('ℹ️ No OAuth hash found on mount');
      return;
    }

    console.log('✅ OAuth redirect detected! Processing tokens...');

    // Step C: Set the auth app variables
    const handleOAuthRedirect = async () => {
      try {
        // Set auth_token
        await setGlobalVariableValue({
          key: 'auth_token',
          value: oauthResult.accessToken,
        });
        console.log('✅ auth_token set');

        // Set refresh_token
        await setGlobalVariableValue({
          key: 'refresh_token',
          value: oauthResult.refreshToken || '',
        });
        console.log('✅ refresh_token set');

        // Set session_exp
        if (oauthResult.expiresAt) {
          await setGlobalVariableValue({
            key: 'session_exp',
            value: oauthResult.expiresAt,
          });
          console.log('✅ session_exp set');
        }

        // Set AUTHORIZATION_HEADER (used by API calls)
        const AUTHORIZATION_HEADER = `Bearer ${oauthResult.accessToken}`;
        await setGlobalVariableValue({
          key: 'AUTHORIZATION_HEADER',
          value: AUTHORIZATION_HEADER,
        });
        console.log('✅ AUTHORIZATION_HEADER set');

        // Set apiKey
        await setGlobalVariableValue({
          key: 'apiKey',
          value: GlobalVariables.AppVariables.apiKey,
        });

        // Fetch user_id from Supabase
        try {
          const userResponse = await fetch(
            'https://qiekucvzrkfhamhjrxtk.supabase.co/auth/v1/user',
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: AUTHORIZATION_HEADER,
                apikey: GlobalVariables.AppVariables.SUPABASE_ANON_KEY,
              },
            }
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const userId = userData?.id || userData?.identities?.[0]?.user_id;
            if (userId) {
              await setGlobalVariableValue({
                key: 'user_id',
                value: userId,
              });
              console.log('✅ user_id set:', userId);
            }
          }
        } catch (userFetchError) {
          console.warn('⚠️ Error fetching user data:', userFetchError.message);
        }

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries();

        // Step D: Clear the hash from the URL
        clearHashFromUrl();
        console.log('✅ Hash cleared from URL');

        // Small delay to ensure all state updates are complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step E: Navigate into the logged-in app (same as email/password login)
        console.log('🚀 Navigating to ProfileScreen...');
        navigation.navigate('ProfileScreen', {});
      } catch (err) {
        console.error('❌ Error handling OAuth redirect:', err);
        setErrorMessage('Failed to complete sign-in. Please try again.');
      }
    };

    handleOAuthRedirect();
  }, []); // Run only on mount

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      // Use different redirect URLs for web vs mobile
      const isWeb = Platform.OS === 'web';
      const redirectTo = isWeb
        ? 'https://5d70a094cb.draftbit.dev'
        : 'dearbaby://auth/callback';

      const supabaseUrl = (Constants?.SUPABASE_URL || 'https://qiekucvzrkfhamhjrxtk.supabase.co').replace(/\/$/, '');
      const url = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;

      console.log('🚀 LoginScreen: Opening Google auth URL:', url);
      console.log('📍 Platform:', Platform.OS);
      console.log('📍 Redirect will be to:', redirectTo);

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        console.error('❌ Cannot open URL:', url);
        setErrorMessage('Unable to open Google sign-in. Please try again.');
        return;
      }

      await Linking.openURL(url);
      console.log('✅ Google auth URL opened successfully');
      console.log('⏳ Waiting for OAuth callback...');
    } catch (error) {
      console.error('❌ Error opening Google auth:', error);
      setErrorMessage('Failed to open Google sign-in. Please try again.');
    }
  };

  return (
    <ScreenContainer scrollable={true} hasSafeArea={true} style={{ backgroundColor: 'transparent' }}>
      {/* Soft Pastel Gradient Background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFF7F8',
        }}
      />

      <View
        style={{
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        {/* Logo - Larger and Elegant */}
        <View style={{ marginBottom: 34, marginTop: 10 }}>
          <ExpoImage
            allowDownscaling={true}
            cachePolicy={'disk'}
            contentPosition={'center'}
            contentFit={'contain'}
            transitionDuration={300}
            transitionEffect={'cross-dissolve'}
            transitionTiming={'ease-in-out'}
            source={imageSource(Images['DearBabyLogo'])}
            style={StyleSheet.applyWidth(
              { height: 140, width: 140 },
              dimensions.width
            )}
          />
        </View>

        {/* Welcome Headline */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: '#2C2C2C',
              fontFamily: 'Inter_600SemiBold',
              fontSize: 26,
              textAlign: 'center',
              marginBottom: 12,
              letterSpacing: -0.5,
            },
            dimensions.width
          )}
        >
          {'Welcome back to DearBaby'}
        </Text>

        {/* Gentle Subheadline */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: '#6F6F6F',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 36,
              lineHeight: 24,
            },
            dimensions.width
          )}
        >
          {"Continue your little one's story."}
        </Text>

        {/* White Card Container for Form */}
        <View
          style={StyleSheet.applyWidth(
            {
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#FFFFFF',
              borderRadius: 32,
              paddingTop: 36,
              paddingBottom: 36,
              paddingLeft: 28,
              paddingRight: 28,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            },
            dimensions.width
          )}
        >
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
                backgroundColor: '#F9FAFB',
                borderBottomWidth: 1,
                borderColor: '#E5E7EB',
                borderLeftWidth: 1,
                borderRadius: 16,
                borderRightWidth: 1,
                borderTopWidth: 1,
                flexDirection: 'row',
                height: 56,
                justifyContent: 'space-between',
                paddingLeft: 20,
                paddingRight: 20,
                width: '100%',
                marginBottom: 16,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
              },
              dimensions.width
            )}
          >
            <Icon
              size={20}
              color={'#9CA3AF'}
              name={'MaterialCommunityIcons/email-outline'}
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
              onChangeText={async newTextInputValue => {
                try {
                  setTextInputValue(newTextInputValue);
                  if (rememberMeChecked) {
                    await setGlobalVariableValue({
                      key: 'saved_email',
                      value: newTextInputValue,
                    });
                  }
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
                backgroundColor: '#F9FAFB',
                borderBottomWidth: 1,
                borderColor: '#E5E7EB',
                borderLeftWidth: 1,
                borderRadius: 16,
                borderRightWidth: 1,
                borderTopWidth: 1,
                flexDirection: 'row',
                height: 56,
                justifyContent: 'space-between',
                paddingLeft: 20,
                paddingRight: 20,
                width: '100%',
                marginBottom: 20,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
              },
              dimensions.width
            )}
          >
            <Icon
              size={20}
              color={'#9CA3AF'}
              name={'Feather/lock'}
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
              onChangeText={async newTextInputValue => {
                try {
                  setPasswordInput(newTextInputValue);
                  if (rememberMeChecked) {
                    await setGlobalVariableValue({
                      key: 'saved_password',
                      value: newTextInputValue,
                    });
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              webShowOutline={true}
              editable={true}
              placeholder={'Password'}
              placeholderTextColor={palettes.App['Custom Color_20']}
              secureTextEntry={!isPasswordVisible}
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
          <Touchable
            onPress={() => {
              try {
                setIsPasswordVisible(prevState => !prevState);
              } catch (err) {
                console.error(err);
              }
            }}
            accessibilityRole={'button'}
            accessibilityLabel={
              isPasswordVisible ? 'Hide password' : 'Show password'
            }
          >
            <Icon
              size={24}
              color={palettes.App['Custom Color_20']}
              name={isPasswordVisible ? 'Ionicons/eye' : 'Ionicons/eye-off'}
            />
          </Touchable>
        </View>
        {/* Remember me */}
        <View style={StyleSheet.applyWidth({ width: 160 }, dimensions.width)}>
          <CheckboxRow
            onPress={async newCheckboxRowValue => {
              try {
                setCheckboxRowValue(newCheckboxRowValue);
                await setGlobalVariableValue({
                  key: 'remember_me',
                  value: Boolean(newCheckboxRowValue),
                });
                if (newCheckboxRowValue) {
                  await Promise.all([
                    setGlobalVariableValue({
                      key: 'saved_email',
                      value: textInputValue,
                    }),
                    setGlobalVariableValue({
                      key: 'saved_password',
                      value: passwordInput,
                    }),
                  ]);
                } else {
                  await Promise.all([
                    setGlobalVariableValue({ key: 'saved_email', value: '' }),
                    setGlobalVariableValue({ key: 'saved_password', value: '' }),
                  ]);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            status={rememberMeChecked}
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
                setErrorMessage('');
                const loginResult = await SupabaseDearBabyApi.loginPOST(Constants, {
                  email: textInputValue,
                  password: passwordInput,
                });
                console.log('Login attempt status', loginResult?.status);
                if (loginResult?.json) {
                  console.log('Login attempt body', loginResult.json);
                }
                if (loginResult?.status >= 400) {
                  console.warn('Login failed', loginResult?.status, loginResult?.text);
                }
                const loginResponse = loginResult?.json;
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
                  await setGlobalVariableValue({
                    key: 'apiKey',
                    value: GlobalVariables.AppVariables.apiKey,
                  });
                  await setGlobalVariableValue({
                    key: 'user_id',
                    value:
                      (loginResponse?.user?.identities?.[0]?.user_id).trim(),
                  });
                  await queryClient.invalidateQueries();
                  await setGlobalVariableValue({
                    key: 'remember_me',
                    value: rememberMeChecked,
                  });
                  if (rememberMeChecked) {
                    await Promise.all([
                      setGlobalVariableValue({
                        key: 'saved_email',
                        value: textInputValue,
                      }),
                      setGlobalVariableValue({
                        key: 'saved_password',
                        value: passwordInput,
                      }),
                    ]);
                  } else {
                    await Promise.all([
                      setGlobalVariableValue({ key: 'saved_email', value: '' }),
                      setGlobalVariableValue({ key: 'saved_password', value: '' }),
                    ]);
                  }

                  // Two-step flow: Fetch profile, check welcome_email_sent, then conditionally send welcome email
                  // This is fire-and-forget and doesn't block navigation
                  console.log('📧 Login: Fetching profile to check welcome_email_sent...');

                  const user_id_for_profile = loginResponse?.user?.identities?.[0]?.user_id?.trim();
                  const auth_token_for_api = auth_token; // Use fresh token from login response

                  // Small delay to ensure auth_token and user_id are fully set in context
                  setTimeout(() => {
                    if (!user_id_for_profile || !auth_token_for_api) {
                      console.warn('⚠️ No user_id or auth_token available, skipping welcome email check');
                      return;
                    }

                    // Create a Constants object with fresh values
                    const freshConstants = {
                      ...Constants,
                      auth_token: auth_token_for_api,
                      user_id: user_id_for_profile,
                      apiKey: GlobalVariables.AppVariables.apiKey,
                    };

                    console.log('📧 Using fresh auth_token:', auth_token_for_api.substring(0, 20) + '...');

                    SupabaseDearBabyApi.getCurrentProfileGET(freshConstants, { user_id: user_id_for_profile })
                      .then((profileResult) => {
                        console.log('📧 Profile fetch response:', profileResult?.status);
                        console.log('📧 Profile data:', profileResult?.json);

                        const profileData = profileResult?.json;
                        const profile = Array.isArray(profileData) ? profileData[0] : null;

                        if (!profile) {
                          console.warn('⚠️ No profile found, skipping welcome email');
                          return;
                        }

                        const welcomeEmailSent = profile.welcome_email_sent;
                        console.log('📧 welcome_email_sent status:', welcomeEmailSent);

                        if (welcomeEmailSent === true) {
                          console.log('ℹ️ Welcome email already sent, skipping');
                          return;
                        }

                        // welcome_email_sent is false, null, or undefined - send welcome email
                        console.log('📧 Sending welcome email...');
                        return SupabaseDearBabyApi.sendWelcomeEmailPOST(freshConstants, {});
                      })
                      .then((result) => {
                        if (!result) return; // Skipped

                        console.log('📧 Welcome email API response:', result?.status);
                        console.log('📧 Welcome email API body:', result?.json);
                        if (result?.json?.success) {
                          console.log('✅ Welcome email sent successfully');
                        } else {
                          console.log('ℹ️ Welcome email response:', result?.status, result?.json);
                        }
                      })
                      .catch((error) => {
                        console.error('❌ Error in welcome email flow:', error?.message);
                        // Don't throw - this is fire-and-forget
                      });
                  }, 100);

                  // Navigate to profile after successful login
                  navigation.navigate('ProfileScreen', {});
                } else {
                  setErrorMessage(
                    loginResponse?.error_description ||
                      loginResponse?.msg ||
                      loginResponse?.message ||
                      'Invalid email or password'
                  );
                }
              } catch (err) {
                console.error(err);
                setErrorMessage(err?.message ?? 'Unable to sign in. Please try again.');
              }
            };
            handler();
          }}
          style={StyleSheet.applyWidth(
            {
              backgroundColor: '#0A84FF',
              borderRadius: 99,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              height: 56,
              textAlign: 'center',
              width: '100%',
              shadowColor: '#0A84FF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            },
            dimensions.width
          )}
          title={'Log in'}
        />
        </View>
        {/* End of White Card Container */}

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
        {/* Google Sign In Button */}
        <Touchable onPress={handleGoogleSignIn} style={{ width: '100%', maxWidth: 440 }}>
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderColor: '#E0E0E0',
                borderLeftWidth: 1,
                borderRadius: 24,
                borderRightWidth: 1,
                borderTopWidth: 1,
                flexDirection: 'row',
                height: 56,
                justifyContent: 'center',
                width: '100%',
                paddingLeft: 20,
                paddingRight: 20,
              },
              dimensions.width
            )}
          >
            <ExpoImage
              allowDownscaling={true}
              cachePolicy={'disk'}
              contentPosition={'center'}
              resizeMode={'contain'}
              transitionDuration={300}
              transitionEffect={'cross-dissolve'}
              transitionTiming={'ease-in-out'}
              source={imageSource(Images['ObGoogle'])}
              style={StyleSheet.applyWidth(
                { height: 24, width: 24, marginRight: 12 },
                dimensions.width
              )}
            />
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: '#2C2C2C',
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 15,
                },
                dimensions.width
              )}
            >
              {'Continue with Google'}
            </Text>
          </View>
        </Touchable>
        {/* Sign up CTA - Emotional & Story-Driven */}
        <Touchable
          onPress={() => navigation.navigate('AuthStack', { screen: 'SignupScreen' })}
          style={StyleSheet.applyWidth({ width: '100%', maxWidth: 440 }, dimensions.width)}
        >
          <View
            style={StyleSheet.applyWidth(
              {
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 20,
                paddingTop: 12,
              },
              dimensions.width
            )}
          >
            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: '#6F6F6F',
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  textAlign: 'center',
                  marginBottom: 6,
                },
                dimensions.width
              )}
            >
              {"Don't have an account?"}
            </Text>

            <Text
              accessible={true}
              selectable={false}
              style={StyleSheet.applyWidth(
                {
                  color: '#FF9AA2',
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22,
                },
                dimensions.width
              )}
            >
              {"Start capturing the moments that matter"}
            </Text>
          </View>
        </Touchable>

        {/* Emotional microcopy */}
        <Text
          accessible={true}
          selectable={false}
          style={StyleSheet.applyWidth(
            {
              color: '#C7CEEA',
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              textAlign: 'center',
              marginTop: 24,
              lineHeight: 20,
              paddingLeft: 20,
              paddingRight: 20,
            },
            dimensions.width
          )}
        >
          {"Every moment you save becomes a memory they'll cherish forever."}
        </Text>
      </View>
    </ScreenContainer>
  );
};

export default withTheme(LoginScreen);
