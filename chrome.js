import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  updateDoc,
  arrayUnion,
  getDocs,
  addDoc,
  getDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_lIXtRunIXYAsxWorkoa8Ye-na3q4St0",
  authDomain: "product-price-tracker-2a820.firebaseapp.com",
  projectId: "product-price-tracker-2a820",
  storageBucket: "product-price-tracker-2a820.appspot.com",
  messagingSenderId: "393984202945",
  appId: "1:393984202945:web:2900ee0ab814c2f62f1c40",
};

// ✅ Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Run this when the extension is first installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "index.html" });
  }
});

// Handle when the user clicks the extension icon
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "http://localhost:5173/" });
});

async function saveUrl(datas) {
  try {
    const storedData = await chrome.storage.sync.get("userId");
    let userDocId = storedData.userId;

    const userDocRef = userDocId
      ? doc(db, "saveProduct", userDocId)
      : await addDoc(collection(db, "saveProduct"), { products: [] });

    if (!userDocId) {
      userDocId = userDocRef.id;
      await chrome.storage.sync.set({ userId: userDocId });
    }

    await updateDoc(userDocRef, {
      products: arrayUnion({ ...datas, timestamp: Timestamp.now() }),
    });

    // ✅ Create Chrome Notification
    chrome.notifications.create(`track-${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Tracking Started",
      message: `Tracking price for ${datas.title}.`,
      priority: 2,
    });
  } catch (error) {
    console.error("❌ Error saving URL:", error);
    // ✅ Create Chrome Notification for error
    chrome.notifications.create(`product-${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Tracking error",
      message: error.message,
      priority: 2,
    });
  }
}

// ✅ Fetch products stored in Firebase
async function fetchTrackedProducts() {
  try {
    const storedData = await chrome.storage.sync.get("userId");
    const userDocId = storedData.userId;

    if (!userDocId) return [];

    const userDocRef = doc(db, "saveProduct", userDocId);
    const userSnapshot = await getDoc(userDocRef);

    return userSnapshot.exists() ? userSnapshot.data().products || [] : [];
  } catch (error) {
    console.error("Error fetching tracked products:", error);
    return [];
  }
}

// ✅ Send email notification when price drops
async function sendEmailNotification(
  email,
  productName,
  productUrl,
  newPrice,
  message,
  heading
) {
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_gg72hpb",
        template_id: "template_lt87md6",
        user_id: "mC0y5y2mxapE6USYb",
        template_params: {
          to_email: email,
          subject: `${heading} ${productName}`,
          message: `${message} Check it out here: ${productUrl}`,
        },
      }),
    });

    // console.log(`✅ Email sent to ${email}`);
    chrome.notifications.create(`Error fetching data- ${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Email sent",
      message: `✅ Email sent to ${email}`,
      priority: 2,
    });
  } catch (error) {
    // console.error("❌ Failed to send email:", error);
    chrome.notifications.create(`Error fetching data- ${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Email sent",
      message: `❌ Failed to send email`,
      priority: 2,
    });
  }
}

// ✅ Fetch current price using ScraperAPI
async function fetchCurrentPrice(productUrl) {
  try {
    const response = await fetch(
      `http://api.scraperapi.com?api_key=d82f154a4b354c47601854fea9fa6113&url=${encodeURIComponent(
        productUrl
      )}`
    );
    const html = await response.text();
    console.log(html);

    // ✅ Send the HTML to the content script for price extraction
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "parseAmazonHTML",
          html: html,
          url: productUrl,
        });
      }
    });

    return null; // Price extraction happens in content script
  } catch (error) {
    chrome.notifications.create(`Error fetching data- ${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Error fetching product data",
      message: `❌ Error fetching product price`,
      priority: 2,
    });
    return null;
  }
}

// ✅ Listen for messages from the content script (price extraction)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updatePrice") {
    // console.log(`✅ Price extracted for ${message.url}: $${message.price}`);

    // ✅ Check if price has dropped
    checkPriceUpdates(message.url, message.price);
  }
});

// ✅ Check for price updates

async function checkPriceUpdates(url, extractedPrice) {
  const products = await fetchTrackedProducts();
  let message;
  let heading;

  for (const product of products) {
    if (product.url === url) {
      const storedData = await chrome.storage.sync.get("userId");
      const storedUserId = storedData.userId;
      const { userPrice, email, title, price, priceHistory = [] } = product;
      console.log("Extracted price", extractedPrice);
      console.log("Previous price", price);
      console.log("User target price", userPrice);

      // ✅ Ensure extractedPrice is valid and different from the stored price
      if (extractedPrice == price) {
        console.log("Price and extractedPrice are the same");
        return;
      }
      if (extractedPrice !== null && extractedPrice !== price) {
        try {
          // Reference Firestore document
          const userDocRef = doc(db, "saveProduct", storedUserId);

          // Retrieve existing product data
          const userDocSnap = await getDoc(userDocRef);
          let existingData = userDocSnap.exists() ? userDocSnap.data() : {};
          let existingPriceHistory = existingData.priceHistory || [];

          // ✅ Create a new price entry
          const newPriceEntry = {
            url, // Store the product URL inside the object
            price: extractedPrice,
            timestamp: Timestamp.now(),
          };

          // ✅ Prevent duplicate price entries
          const lastEntry =
            existingPriceHistory.length > 0
              ? existingPriceHistory[existingPriceHistory.length - 1]
              : null;

          if (!lastEntry || lastEntry.price !== extractedPrice) {
            existingPriceHistory.push(newPriceEntry);

            // ✅ Update Firestore
            await updateDoc(userDocRef, {
              price: extractedPrice, // Store the latest price
              priceHistory: arrayUnion(newPriceEntry), // Append new price entry
            });
          }

          // ✅ Notifications
          // if (extractedPrice < price) {
          //   chrome.notifications.create(`price-drop-${Date.now()}`, {
          //     type: "basic",
          //     iconUrl: "image/image.png",
          //     title: "Price Drop Alert!",
          //     message: `The price of ${title} is now $${extractedPrice}.`,
          //     priority: 2,
          //   });
          //   message = `The price of ${title} is now $${extractedPrice}.`;
          //   heading = "Price Drop Alert!";

          //   // ✅ Send Email Notification
          //   sendEmailNotification(
          //     email,
          //     title,
          //     url,
          //     extractedPrice,
          //     message,
          //     heading
          //   );
          // }

          if (extractedPrice <= userPrice) {
            chrome.notifications.create(`price-match-${Date.now()}`, {
              type: "basic",
              iconUrl: "image/image.png",
              title: "Great News! 🎉",
              message: `The price of ${title} is now $${extractedPrice}, matching your desired price!`,
              priority: 2,
            });
            message = `The price of ${title} is now $${extractedPrice}, matching your desired price!`;
            heading = "Great News! 🎉";
            // ✅ Send Email Notification
            sendEmailNotification(
              email,
              title,
              url,
              extractedPrice,
              message,
              heading
            );
          }

          if (extractedPrice > price) {
            chrome.notifications.create(`price-increase-${Date.now()}`, {
              type: "basic",
              iconUrl: "image/image.png",
              title: "Tracking Updated",
              message: `The price of ${title} has increased to $${extractedPrice}.`,
              priority: 2,
            });
            message = `The price of ${title} has increased to $${extractedPrice}.`;
            heading = "Tracking Updated";
            // ✅ Send Email Notification
            sendEmailNotification(
              email,
              title,
              url,
              extractedPrice,
              message,
              heading
            );
          }
        } catch (error) {
          console.error("❌ Error saving price update:", error);

          // Notify user of error
          chrome.notifications.create(`error-${Date.now()}`, {
            type: "basic",
            iconUrl: "image/image.png",
            title: "Tracking Error",
            message: error.message,
            priority: 2,
          });
        }
      }
    }
  }
}

chrome.alarms.create("priceCheck", { periodInMinutes: 1440 }); // 1440 minutes = 24 hours

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "priceCheck") {
    const products = await fetchTrackedProducts();
    for (const product of products) {
      const { url } = product;
      fetchCurrentPrice(url);
      await checkPriceUpdates();
    }
  }
});

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveProduct") {
    saveUrl(message.data);
  }
});
