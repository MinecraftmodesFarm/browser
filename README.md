# SecretBrowser 1.0

A mobile-first browser workspace designed for deployment on Render. Includes an installable PWA shell and per-tab navigation history.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open http://localhost:3000

## Deploy to Render
1. Create a GitHub repository and upload the contents of this folder.
2. In Render choose **New + → Blueprint** and select the repository, or create a Web Service.
3. Render detects `render.yaml`; use `npm install` as build command and `npm start` as start command.
4. After deployment, open the Render URL on iPhone Safari.

## Optional live AI
The app works without an API key in demo mode. To enable live AI:
- Add `OPENAI_API_KEY` as a secret environment variable in Render.
- Optionally set `OPENAI_MODEL` (default: `gpt-4o-mini`).
- Never put the key in `public/app.js`, HTML, or a public repository.
- API usage may incur charges.

## Important browser limitations
SecretBrowser is a website, not a native iOS browser. Many websites (including Google in some configurations) block iframe embedding. The app provides an external-open link for those sites. A website cannot inspect or manage cookies belonging to unrelated domains, cannot control Safari's private mode, and cannot make the entire iPhone anonymous. Cookie Manager controls only cookies and local storage for the SecretBrowser origin. HttpOnly cookies are not readable from JavaScript.

Private tabs in this app are not added to SecretBrowser's own history/bookmarks and are held in page memory. This does not hide browsing from websites, network operators, the browser app, or device-level monitoring. For stronger privacy, use Safari's built-in Private Browsing and iOS privacy controls.

## Features
- Responsive dark/orange interface
- Address/search bar and multi-tab workspace
- External website opening and iframe preview where permitted
- Local bookmarks and history for non-private tabs
- Private tabs (local app-level behavior only)
- Cookie/local storage controls for this app's own origin
- Device information inspector
- Local settings backup/import
- Secret AI demo mode; optional server-side AI endpoint


## Install on iPhone
After deploying and opening the site in Safari:
1. Tap Share.
2. Choose **Add to Home Screen**.
3. Launch SecretBrowser from the Home Screen.

The PWA caches the app shell for repeat/offline opening; it does not cache third-party websites.
