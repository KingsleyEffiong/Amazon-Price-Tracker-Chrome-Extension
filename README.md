# Amazon Price Tracker Chrome Extension

## 📌 Overview
This Chrome extension tracks Amazon product prices and notifies users when a price drops. It automatically fetches the latest price, compares it with the user-defined target price, and sends notifications via Chrome alerts and email.

## 🚀 Features
- ✅ **Automated Price Tracking** – Monitors selected products for price changes.
- ✅ **Background Execution** – Runs in the background, even when Amazon is not open.
- ✅ **Real-time Notifications** – Sends alerts via Chrome notifications and email.
- ✅ **Firebase Integration** – Stores and retrieves user-tracked products.
- ✅ **Content Script Scraping** – Extracts price data directly from Amazon product pages.

## 🛠 Installation
1. **Clone the Repository**  
   ```sh
   git clone https://github.com/yourusername/amazon-price-tracker.git
   ```
2. **Go to Chrome Extensions Page**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer Mode" (top-right corner)
   - Click "Load Unpacked" and select the cloned project folder
3. **Set Up Firebase**
   - Update the Firebase configuration in the extension
   - Ensure Firestore is enabled and structured correctly
4. **Set Up Email Notifications (EmailJS)**
   - Configure EmailJS with your service ID, template ID, and user ID

## 🔧 How It Works
1. **Fetch Products** – Retrieves tracked products from Firebase.
2. **Scrape Amazon Price** – Uses a content script to extract price data.
3. **Compare Prices** – Checks if the new price is lower than the user-set price.
4. **Send Notifications** – Alerts the user via Chrome notifications and email.

## 📄 Manifest Permissions
```json
{
  "host_permissions": ["https://www.amazon.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs",
    "notifications",
    "alarms"
  ],
  "content_scripts": [
    {
      "js": ["content.js"],
      "matches": ["https://www.amazon.com/*"]
    }
  ]
}
```

## 📝 License
This project is licensed under the MIT License.

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

## 📧 Contact
For any inquiries, feel free to reach out via email or GitHub Issues.
Email me @ kingsleyeffiong642@gmail.com

