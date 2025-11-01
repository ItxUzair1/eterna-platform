# Fix: 404 Error on /api/email/accounts

## Issue
Getting 404 error when trying to access `/api/email/accounts` endpoints.

## Solution

The routes have been added but **the server needs to be restarted** to load them.

### Steps to Fix:

1. **Stop your server** (if running)
   - Press `Ctrl+C` in the terminal where the server is running
   - Or kill the process

2. **Restart the server**
   ```bash
   cd server
   npm start
   # or
   node src/index.js
   # or whatever command you use to start the server
   ```

3. **Verify the routes are loaded**
   - The server should start without errors
   - You should see routes being registered in the console (if you have logging)

4. **Test the endpoint**
   - Go to `/dashboard/email-settings`
   - Try creating an SMTP account again

## Alternative: Check Server Logs

If restarting doesn't work, check the server console for:
- Any syntax errors
- Route registration errors
- Import/module errors

The routes are defined in:
- `server/src/modules/email/email.routes.js` (lines 29-31)
- `server/src/modules/email/email.controller.js` (functions are exported)

## Quick Test

After restarting, you can test if the route exists by:
1. Opening browser dev tools
2. Going to Network tab
3. Navigating to `/dashboard/email-settings`
4. Check if the GET request to `/api/email/accounts` returns 200 (or 404 if no account exists yet, which is OK)

The 404 should only appear when:
- Server hasn't been restarted (route not registered)
- There's a syntax error preventing the route from loading
- The route path is wrong (but we verified it's `/api/email/accounts`)

