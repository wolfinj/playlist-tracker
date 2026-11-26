# Playlist Tracker v7

Local-first YouTube playlist tracker with Google sign-in, Firestore synchronization and Cloudflare Pages Functions for secure YouTube imports.

## Setup

1. Create a Firebase Spark project, enable Google authentication and Firestore in a European region. Register a web app and copy its public configuration into `public/config.js`.
2. Publish the repository using Cloudflare Pages (framework None, output `public`, no build command). Add the Pages domain to Firebase Authentication authorized domains.
3. In Cloudflare Pages settings add encrypted `YOUTUBE_API_KEY`, `FIREBASE_PROJECT_ID` and `ALLOWED_IMPORT_EMAILS` (comma-separated verified Google email addresses). Redeploy after configuration.
4. Publish `firestore.rules` in Firebase Console before signing in.

Never commit YouTube keys, service-account credentials or personal backups. This repository is a public source repository.

## Status

Initial v7 foundation; deployment configuration and browser integration tests are required before production use.
