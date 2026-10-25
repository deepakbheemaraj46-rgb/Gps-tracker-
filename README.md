# Consent-based Live GPS Sharing Website

## What it does
- Creates a one-time sharing session.
- Produces a link to send to the person and a separate private viewer link.
- The person must open the share link, tap **Start Location Sharing**, and allow browser location permission.
- The viewer map updates while the share page sends GPS updates.
- The person can stop sharing at any time.

## Important limitations
- This project does not secretly track people. It only receives GPS after the person knowingly starts sharing and grants permission.
- Live updates generally require the share page to remain open. Mobile browsers may pause updates in the background.
- No database is used. Sessions are stored in RAM and are lost when the server restarts/redeploys. Create new links if this happens.
- Anyone with the private viewer link can see the location while sharing is active. Keep that link secret.
- This is a starter project, not a security-audited production service.

## Deploy on Render
1. Upload all files and folders in this project to a GitHub repository. Keep `package.json`, `server.js`, and the `public` folder at the repository root.
2. In Render, choose **New + -> Web Service** (not Static Site).
3. Connect the GitHub repository.
4. Set:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Click Create Web Service and wait for deployment.
6. Open the Render URL. Create a session.
7. Send the **share link** to the consenting person. Open the **private viewer link** on your own phone.

## Local run
Install Node.js 18 or later, then run:
```bash
npm install
npm start
```
Open http://localhost:3000
