import React from 'react';
import { ScreenContainer, withTheme } from '@draftbit/ui';
import { Text } from 'react-native';
import * as GlobalStyles from '../GlobalStyles.js';
import * as GlobalVariables from '../config/GlobalVariableContext';
import palettes from '../themes/palettes';
import Breakpoints from '../utils/Breakpoints';
import * as StyleSheet from '../utils/StyleSheet';
import useNavigation from '../utils/useNavigation';
import useParams from '../utils/useParams';
import useWindowDimensions from '../utils/useWindowDimensions';

const AppInitScreen = props => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const navigation = useNavigation();
  const Constants = GlobalVariables.useValues();
  const Variables = Constants;
  React.useEffect(() => {
    try {
      if (Constants['auth_token']) {
        navigation.navigate('MainStack', {
          screen: 'BottomTabNavigator',
          params: { screen: '' },
        });
      } else {
        navigation.navigate('AuthStack', { screen: '' });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <ScreenContainer
      hasSafeArea={false}
      scrollable={false}
      style={StyleSheet.applyWidth(
        {
          backgroundColor: theme.colors.text.danger,
          borderColor: 'rgb(91, 26, 26)',
          position: 'relative',
        },
        dimensions.width
      )}
    >
      {/* Forgot Password */}
      <Text
        accessible={true}
        selectable={false}
        {...GlobalStyles.TextStyles(theme)['Text'].props}
        selectionColor={theme.colors.branding.primary}
        style={StyleSheet.applyWidth(
          StyleSheet.compose(
            GlobalStyles.TextStyles(theme)['Text'].style,
            theme.typography.body1,
            { alignSelf: 'flex-start', color: theme.colors.branding.secondary }
          ),
          dimensions.width
        )}
      >
        {'Forgot Password'}
      </Text>
    </ScreenContainer>
  );
};

export default withTheme(AppInitScreen);
