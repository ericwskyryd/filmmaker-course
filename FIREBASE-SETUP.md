# Firebase setup for Creator Reps (one-time, Eric only)

This is the only console work needed to turn on Google sign-in and cloud progress
sync for train.skyryd.ai. Everything else (the code, the sign-in button, the sync
logic) is already built and deployed. This document is just the "paste this in
the console and click Publish" step, plus what to check afterward.

## Step 1: Publish the security rules (required, do this first)

The security rules are what actually lock down who can read and write what. The
site will not work correctly for signed-in users until these are published.

1. Go to the [Firebase console](https://console.firebase.google.com/) and open
   the **creators-reps** project.
2. In the left sidebar, click **Build > Firestore Database**.
3. Click the **Rules** tab along the top of the Firestore Database page.
4. Select all the existing text in the editor and delete it.
5. Open the file `site/firestore.rules` in this repo, copy its entire contents,
   and paste it into the Rules editor.
6. Click **Publish**.

That's it. In plain terms, what you just turned on:
- Any signed-in tester can read and save only their own progress.
- You (eric@skyryd.com) can additionally read everyone's progress, which is
  what powers the admin testers table.
- Nobody else can read or write anything else in the database.

## Step 2: Confirm Google sign-in is enabled

This is very likely already on if the project has been used before, but it's
worth a 10-second check.

1. In the Firebase console, left sidebar, click **Build > Authentication**.
2. Click the **Sign-in method** tab.
3. Find **Google** in the provider list. If it says "Enabled," you're done.
4. If it's not enabled: click on **Google**, toggle it on, pick a support email
   (your email is fine), and click **Save**.

## Step 3 (optional but recommended): confirm the authorized domain

1. Still in **Authentication > Sign-in method**, scroll down to
   **Authorized domains**.
2. Confirm `train.skyryd.ai` is in that list. If it's missing, click
   **Add domain** and add it. Without this, Google sign-in will fail on the
   live site (it will still work fine when testing locally).

## What you do NOT need to do

- No code changes. No npm installs. No API keys to generate: the config
  embedded in the site is the public, safe-to-expose kind Google's own docs
  say is fine to ship in client code (it identifies the project, it does not
  grant access on its own -- the rules above are what actually gate access).
- No changes to GitHub Pages or the CNAME.

## How to sanity-check it worked

Once rules are published:
1. Visit train.skyryd.ai, click **Sign in** in the header, and complete the
   Google popup.
2. Check a lesson box. Wait a couple seconds (writes are batched to avoid
   burning through the free quota), then open the same lesson in an
   incognito window or a second device, sign in with the same Google account,
   and confirm the box is already checked.
3. Visit train.skyryd.ai/admin.html signed in as eric@skyryd.com and confirm
   you see a table (even if it just has your own row in it). Sign in with any
   other Google account and confirm you instead see "This page isn't for you."

If sign-in itself fails with a console error mentioning "unauthorized-domain,"
that's Step 3 above, not a code bug.
