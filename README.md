# DearBaby Expo MVP (Import & Run)

A minimal Expo + React Native app you can import and run immediately (Expo Go / Snack / local). 
Includes:
- Expo Router tab layout (Timeline, Upload, Profile)
- Mock Auth context (swap later to Supabase or Oracle IDCS)
- OCI Object Storage **PAR** upload screen (paste PAR URL → pick image → PUT upload)
- Clean UI primitives (Button, Card)

## 1) Run fast with Snack (no installs)
1. Push this folder to a GitHub repo (or zip upload).
2. Open https://snack.expo.dev, choose **Import Git repository** (or upload zip).
3. Press **Run** and scan QR with **Expo Go** on your phone.

## 2) Run locally
```bash
npm i
npm run start
# scan QR with Expo Go
```

> Requires Node 18+ and Expo CLI (installed automatically by `expo` dep).

## 3) EAS Build for TestFlight/APK
- Create an Expo account, run `npx expo login`.
- `npx expo prebuild` if you need native mods (not required here).
- `npx eas build -p ios` / `-p android`

## 4) Uploading to OCI with PAR
This project uses a **Pre-Authenticated Request (PAR)** URL:
1. Create a PAR for your target object in OCI Object Storage (PUT allowed).
2. Copy the full PAR URL.
3. In the app, go to **Upload** tab → paste the PAR URL → pick an image → Upload.

The upload helper is in `lib/storage.ts` (`putToParUrl`). It performs a `PUT` with the image bytes and `Content-Type`.
HEIC images: some Android devices can’t render HEIC; prefer picking JPEG/PNG or convert server-side after upload.

## 5) Swap in real Auth later
- Replace `context/AuthProvider.tsx` with Supabase or Oracle IDCS logic.
- Keep the UI intact; only the `signIn/signOut` functions need wiring.

## 6) Folder structure
```
app/               # expo-router screens
components/        # UI primitives
context/           # Auth provider
lib/               # OCI storage helpers
assets/            # placeholders
```

## Notes
- Uses only managed workflow APIs to stay Expo Go–compatible (no native modules).
- Safe to extend inside Draftbit later via custom packages/files or export-and-code approach.
