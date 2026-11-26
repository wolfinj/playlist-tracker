# Playlist Tracker v7

Initial browser-based prototype: Google sign-in, Firestore personal libraries, YouTube player and reviews. Not a full migration of v6 yet.

## Configuration

1. Create Firebase Spark project, enable Google sign-in and Firestore (EU), register web app. Copy public config to `public/config.js`.
2. Publish `firestore.rules` in Firebase Console.
3. Connect GitHub repository to Cloudflare Pages. Framework None, no build command, output `public`. Add Pages domain to Firebase authorized domains.
4. Set Cloudflare server-side variables `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY` and encrypted secrets `YOUTUBE_API_KEY`, `ALLOWED_IMPORT_EMAILS` (comma-separated verified Google emails). Redeploy.

Never commit YouTube keys or personal backups. Import is restricted to allowlisted users and 250 entries per playlist. Durable rate limits, metadata expiry, offline cache, migration, sharing, exports and full browser testing are outstanding. Do not open imports to untrusted users until quota controls are implemented. Firestore rules isolate users by authenticated UID.
