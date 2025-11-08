# AGENTS.md

## Project Overview

This is a React Native application built with Draftbit and Expo. The app uses Expo Router for file-based navigation and is configured to run on iOS, Android, and web platforms.

**Key Technologies:**

- React Native 0.76.9
- Expo ~52.0.46
- Expo Router ~4.0.21 (file-based routing)
- @draftbit/ui 52.1.10 (Draftbit's component library)
- React Query for data fetching
- React Navigation (underlying router)

## Development Commands

### Running the App

```bash
# Start development server
yarn start

# Run on specific platforms
yarn android    # Android emulator/device
yarn ios        # iOS simulator/device (macOS only)
yarn web        # Web browser
```

After running `yarn start`, you can also press:

- `a` - open on Android
- `i` - open on iOS
- `w` - open on web

### Testing

```bash
# Run tests in watch mode
yarn test
```

### Dependencies

```bash
# Install dependencies (use yarn, not npm)
yarn

# After installing dependencies, patches are automatically applied via postinstall
```

## Architecture

### Entry Point & Provider Chain

The app initializes in `App.js` with this provider hierarchy (from outermost to innermost):

1. **ThemeProvider** (@draftbit/ui) - Provides Draftbit theme system
2. **SafeAreaProvider** - Handles safe area insets for notches/navigation
3. **SafeAreaFrameContextProvider** - Custom web-specific frame size handling for drawers
4. **GlobalVariableProvider** - App-wide state management with AsyncStorage persistence
5. **QueryClientProvider** - React Query client for API calls
6. **ExpoRoot** - Expo Router entry point (reads from `app/` directory)

### File-Based Routing (Expo Router)

Routes are defined by files in the `app/` directory:

- `app/index.js` - Home screen (mapped to `/`)
- `app/_layout.js` - Root layout with Stack navigator configuration

To add a new screen, create a file in `app/` (e.g., `app/profile.js` becomes `/profile` route).

### Global State Management

**Location:** `config/GlobalVariableContext.js`

Two types of variables:

- **DeviceVariables** - Persisted to AsyncStorage (user preferences, auth tokens)
- **AppVariables** - In-memory only (temporary state)

Usage in components:

```javascript
import { useValues, useSetValue } from '../config/GlobalVariableContext';

const MyComponent = () => {
  const values = useValues(); // Read all variables
  const setGlobalVariableValue = useSetValue(); // Write variables

  // Update a variable
  await setGlobalVariableValue({ key: 'myKey', value: 'myValue' });
};
```

### Theme System

**Location:** `themes/DraftbitDefault.js`, `themes/palettes.js`

- Draftbit theme defines typography, spacing, colors
- Supports light/dark mode (automatic via `userInterfaceStyle: "automatic"` in app.json)
- Web platform includes custom `Appearance` API polyfill (App.js:49-93) to handle theme switching

Access theme in components:

```javascript
import { useTheme } from "@draftbit/ui";

const MyComponent = () => {
  const theme = useTheme();
  // Use theme.colors, theme.typography, etc.
};
```

### Utility Hooks & Functions

**Location:** `utils/`

Key utilities:

- `useNavigation.js` - Navigation wrapper with Expo Router compatibility
- `useWindowDimensions.js` - Responsive dimensions hook
- `useIsFocused.js` - Screen focus detection
- `useIsOnline.js` - Network connectivity status
- `DateUtils.js` - Date formatting helpers
- `handleRestApiResponse.js` - API response standardization
- `StyleSheet.js` - Enhanced StyleSheet with theme integration

### Asset Management

**Location:** `config/cacheAssetsAsync.js`, `assets/`

Assets (images, fonts) are cached on app startup before splash screen hides. Add new assets to the appropriate config file (Fonts.js, Images.js) and they'll be automatically cached.

### Navigation Configuration

The root layout (`app/_layout.js`) uses Stack navigator with:

- Custom Android back button icon
- Theme-aware header styling
- Right-to-left language support detection (I18nManager)

### Platform-Specific Behavior

- **Web:** Custom SafeAreaFrame handling for drawer navigation (App.js:122-123)
- **Web:** Custom Appearance API implementation for theme switching
- **iOS/Android:** Different status bar handling in App.js

## Patches

The project uses `patch-package` to maintain local patches to node_modules. Patches are stored in `patches/` and automatically applied after `yarn install`.

## Build Configuration

**iOS:**

- Bundle ID: `com.draftbit.untitledapp`
- No iCloud storage
- Privacy manifests configured for App Store compliance

**Android:**

- Package: `com.draftbit.untitledapp`
- Compile/Target SDK: 35
- Build Tools: 35.0.0
- Blocked permissions: READ_MEDIA_IMAGES, READ_MEDIA_VIDEO

## Custom Packages & Plugins

If custom native packages are added, the app may not run on Expo Go. Use [EAS Build](https://docs.expo.dev/build/setup/) for custom development builds.

## Important Notes

- Always use `yarn` instead of `npm` for package management
- The app is configured for both Expo Go and custom builds
- Splash screen is manually controlled and hidden after assets cache + GlobalVariables load
- Use Draftbit's `ScreenContainer` component from `@draftbit/ui` for consistent screen layouts
