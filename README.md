# YuRyS

A mobile-first todo PWA built with Next.js, Tailwind, and Firebase (email/password sign-in + Firestore with offline persistence).

## Firebase setup (one-time)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com), then add a **Web app** to it.
2. Copy the web app config values into `.env.local` (see `.env.example` for the variable names).
3. **Authentication → Sign-in method**: enable **Email/Password**. There is no register page — create your account under **Authentication → Users → Add user**.
4. **Firestore Database**: create a database, then paste the contents of `firestore.rules` into **Rules** and publish. (Or `firebase deploy --only firestore:rules` with the Firebase CLI.)
5. When you deploy, add your production domain under **Authentication → Settings → Authorized domains** (`localhost` is authorized by default).

## Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- Data model: `users/{uid}/todos/{cardId}` with `{ title, tag, col, createdAt }` — kanban columns are `backlog | todo | doing | done`. Legacy `{ text, done }` docs are mapped on read. Each user can only access their own cards (enforced by `firestore.rules`).
- Login art: drop an image at `public/login-art.png` to fill the sign-in page's art panel (it layers over the gradient; without it the gradient shows).
- Offline: Firestore's persistent local cache handles todo data; `public/sw.js` is a minimal service worker that serves the last cached shell when offline. For full asset precaching, consider [Serwist](https://github.com/serwist/serwist).
- PWA manifest lives at `app/manifest.ts` (served as `/manifest.webmanifest`).
- Install to home screen: on iOS Safari use Share → "Add to Home Screen"; Chrome offers an install prompt automatically. Push notifications and install on iOS require serving over HTTPS.
