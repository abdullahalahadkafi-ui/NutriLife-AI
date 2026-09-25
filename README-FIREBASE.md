# NutriLife AI — Firebase Blog Admin Setup

This version moves the blog data from the old `blogs.js` array into Firebase Firestore and adds a protected admin panel.

## What was changed

- `blog.html` now loads published articles from Firestore.
- `blog.html?post=slug` opens a shareable article URL.
- `admin.html` provides email/password login, article CRUD, draft/publish, image upload, preview, search, categories and a simple rich-text editor.
- `firebase-app.js` initializes Firebase Auth, Firestore, Storage and Analytics.
- `firebase-config.js` contains the Firebase Web configuration you supplied.
- `firestore.rules` allows public reads only for published posts and allows writes only to approved admins.
- `storage.rules` restricts blog-image uploads to approved admins and limits files to 5 MB and image MIME types.
- `legacy-blogs.js` contains the seven existing articles so they can be imported once from the admin panel.

## 1. Firebase Console

Open your Firebase project: `nutrilife-ai-2d20f`

### Enable Authentication

Firebase Console → Authentication → Sign-in method → enable **Email/Password**.

Create your admin user under Authentication → Users. Do not add a public registration form to this website.

### Create Firestore

Firebase Console → Firestore Database → Create database.

Then create this document manually:

- Collection: `admins`
- Document ID: **the UID of your admin user**
- Field: `active` → boolean → `true`

Example:

```
admins
  └── YOUR_ADMIN_UID
       └── active: true
```

The browser cannot create or modify admin documents. This prevents an ordinary signed-in user from promoting themselves.

### Enable Storage

Firebase Console → Storage → Get started.

The admin panel uses Storage for cover images. Maximum upload size in the included rules is 5 MB.

## 2. Deploy the Security Rules

Install Firebase CLI if you do not have it:

```
npm install -g firebase-tools
```

Login:

```
firebase login
```

From this project folder:

```
firebase deploy --only firestore:rules,storage
```

The included `.firebaserc` points to `nutrilife-ai-2d20f`.

If you do not want to use the CLI, copy the contents of `firestore.rules` into Firestore → Rules and `storage.rules` into Storage → Rules.

## 3. Import the existing blog articles

1. Deploy the updated website.
2. Open `/admin.html`.
3. Sign in with the Firebase admin account.
4. Confirm that your account is approved by the `admins/{UID}` document.
5. Click **Import old blogs** once.
6. Confirm the import.

The seven articles previously stored in `blogs.js` will be copied into Firestore as published posts.

After confirming the import, the old `blogs.js` file is no longer needed by the public blog.

## 4. Publishing a new article

Admin panel → New → fill in:

- Title
- Slug
- Category
- Read time
- Publish date
- Excerpt
- Cover image URL or upload an image
- Article content
- Optional SEO title/description
- Published toggle

Use **Save draft** for an unpublished post or **Publish** to make it visible on the public blog.

## Security notes

- Firebase Web API keys are not secret credentials. The real protection comes from Authentication and Security Rules.
- Never upload a Firebase service-account JSON file or Admin SDK private key to this site.
- Keep `admins` writes blocked from the client, as in the included rules.
- Do not add a client-side password or hard-coded admin password.
- Consider enabling Firebase App Check after the basic setup is working.
- If the Firebase project is ever moved to another account/project, update `firebase-config.js` and `.firebaserc`.

## Important limitation for SEO

The public blog is now dynamically rendered from Firestore. The URL format `blog.html?post=slug` is shareable, but this static architecture does not generate a separate server-rendered HTML file for every article. If you later want maximum search-engine SEO for individual posts, the next upgrade should be a build/SSR layer (for example, generating static article pages from Firestore during deployment).
