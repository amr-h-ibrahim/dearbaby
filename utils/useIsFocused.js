import React from "react";
import { useNavigation, useNavigationContainerRef } from "expo-router";

const useIsFocused = () => {
  const navigation = useNavigation();
  const navigationContainerRef = useNavigationContainerRef();
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const focusListener = () => {
      setIsFocused(true);
    };

    const blurListener = () => {
      setIsFocused(false);
    };

    navigation.addListener("focus", focusListener);
    navigation.addListener("blur", blurListener);

    return () => {
      navigation.removeListener("focus", focusListener);
      navigation.removeListener("blur", blurListener);
    };
  }, []);

  // If navigationContainerRef is not ready yet
  // then isFocused should be assumed to be false otherwise any navigation action will throw an error
  // See https://github.com/expo/router/issues/740#issuecomment-1625190275
  if (!navigationContainerRef?.isReady()) {
    return false;
  }

  return isFocused;
};

export default useIsFocused;
