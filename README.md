# TWEET-DELETER-
A Chrome extension that automatically deletes your tweets, retweets, and reposts from X/Twitter with smart detection, multi-language support, and optional auto-scrolling.
Twitter Tweet Cleaner is a powerful Chrome extension that lets you automatically clean your X/Twitter profile by deleting tweets, retweets, and reposts in bulk.
It uses smart detection to adapt to Twitter’s constantly changing interface, supports multiple languages, and comes with a modern popup interface for full control.

✨ Key Features
Bulk Deletion — Automatically remove your own tweets, retweets, and reposts in one click.

Multi-language Support — Works with over 12 interface languages (English, French, Spanish, German, Turkish, Japanese, Korean, Russian, etc.).

Repost & Retweet Removal — Handles both classic retweets and the new repost feature.

Auto-scrolling — Continuously scrolls the page to load older tweets for deletion.

Intelligent Filtering — Skips ads, promoted posts, empty gaps, and tweets not belonging to you.

Detailed Logs — Console output showing what’s deleted, skipped, or failed, including the reason for each skip.

Modern Popup UI — Toggle auto-start, auto-scroll, speed, and retweet/reply inclusion from a clean interface.

📦 Installation
Download or clone this repository.

Open chrome://extensions in your browser.

Enable Developer Mode (top right).

Click "Load unpacked" and select the extracted folder.

The extension will appear in Chrome’s extensions menu (puzzle icon). Pin it for quick access.

🚀 How to Use
Open X/Twitter and navigate to your profile page (e.g., https://x.com/yourusername).

⚠️ Deletion only works on your own tweets and reposts. If you’re on the Home feed, nothing will be removed.

Click the extension icon to open the popup.

Adjust your preferences:

Auto Start — Start deletion automatically when the page loads.

Auto Scroll — Scroll down to load more posts as deletion progresses.

Include Retweets — Remove retweets and reposts in addition to your tweets.

Include Replies — Also delete tweets that are replies to others.

Speed — Delay between actions (lower = faster, but may risk hitting limits).

Click Start and watch the magic happen.

Progress and messages will appear in the popup and the browser console (F12 → Console).

⚙️ Technical Notes
Selector Resilience — Uses multiple CSS selectors and keywords to adapt to UI changes.

Smart Skipping — Avoids clicking on empty separators, promoted content, or posts without menus.

Error Feedback — If a deletion fails, the reason is logged (“No menu detected”, “Delete button not found”, etc.).

Rate Limits — Deleting too fast can trigger temporary restrictions on Twitter. Use a reasonable speed setting.

🛡️ Disclaimer
This extension interacts with your own Twitter account and deletes content irreversibly.
Use it with caution. The developer is not responsible for any accidental deletions or account restrictions.

📜 License
This project is released under the MIT License — feel free to use, modify, and share.
