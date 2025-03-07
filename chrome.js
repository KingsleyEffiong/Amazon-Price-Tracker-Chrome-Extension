import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  updateDoc,
  arrayUnion,
  getDocs,
  addDoc,
  setDoc,
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
  chrome.tabs.create({ url: "http://localhost:5173/dashboard" });
});

async function saveUrl(datas) {
  try {
    const storedData = await chrome.storage.sync.get("userId");
    let userDocId = storedData.userId;

    // If no stored userId, use the one sent from content script (datas.userId)
    if (!userDocId) {
      if (!datas.userId) {
        console.error(
          "❌ No userId found in storage or datas.userId from content script!"
        );
        chrome.notifications.create(`error-${Date.now()}`, {
          type: "basic",
          iconUrl: "image/image.png",
          title: "Tracking Error",
          message: "No user ID found. Please log in first.",
          priority: 2,
        });
        return;
      }

      userDocId = datas.userId; // Use the userId from content script
      await chrome.storage.sync.set({ userId: userDocId }); // Save it in storage
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "sendUserId",
            userId: userDocId,
          });
        }
      });
    }

    // Remove `userId` from datas before saving
    const { userId, ...productData } = datas;

    // Reference Firestore document using userDocId
    const userDocRef = doc(db, "saveProduct", userDocId);

    // Check if the document exists
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // ✅ Document does not exist, create it first
      await setDoc(userDocRef, {
        products: [{ ...productData, timestamp: Timestamp.now() }],
      });
    } else {
      // ✅ Document exists, update it
      await updateDoc(userDocRef, {
        products: arrayUnion({ ...productData, timestamp: Timestamp.now() }),
      });
    }

    // ✅ Create Chrome Notification (Success)
    chrome.notifications.create(`track-${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Tracking Started",
      message: `Tracking price for ${datas.title}.`,
      priority: 2,
    });
  } catch (error) {
    console.error("❌ Error saving URL:", error);

    // ✅ Create Chrome Notification (Error)
    chrome.notifications.create(`product-${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Tracking Error",
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

async function checkPriceUpdates(url, extractedPrice) {
  try {
    const products = await fetchTrackedProducts();
    let message;
    let heading;

    for (const product of products) {
      if (product.url === url) {
        const storedData = await chrome.storage.sync.get("userId");
        const storedUserId = storedData.userId;
        const {
          userPrice,
          email,
          title,
          price,
          priceHistory = [],
          notifications = [],
        } = product;

        const extractedPriceNum = Number(extractedPrice);
        const userPriceNum = Number(userPrice);
        const prevPriceNum = Number(price);

        if (isNaN(extractedPriceNum) || extractedPriceNum === prevPriceNum) {
          message = `The price of ${title} remains $${prevPriceNum}. No change detected.`;
          heading = "Price still remains the same";
        } else if (extractedPriceNum < prevPriceNum) {
          message = `The price of ${title} dropped from $${prevPriceNum} to $${extractedPriceNum}.`;
          heading = "Price Drop Alert!";
        } else if (!isNaN(userPriceNum) && extractedPriceNum <= userPriceNum) {
          message = `The price of ${title} is now $${extractedPriceNum}, matching your desired price!`;
          heading = "Great News! 🎉";
        } else if (extractedPriceNum > prevPriceNum) {
          message = `The price of ${title} has increased to $${extractedPriceNum}.`;
          heading = "Tracking Updated";
        }

        if (message) {
          // Create notification in Chrome
          chrome.notifications.create(`price-update-${Date.now()}`, {
            type: "basic",
            iconUrl: "image/image.png",
            title: heading,
            message: message,
            priority: 2,
          });

          // Update Firestore with the new notification
          const userDocRef = doc(db, "saveProduct", storedUserId);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const data = userSnapshot.data().products;
            const productIndex = data.findIndex((item) => item.url === url);

            if (productIndex !== -1) {
              data[productIndex].price = extractedPriceNum;
              data[productIndex].priceHistory = [
                ...priceHistory,
                { price: extractedPriceNum, timestamp: Date.now() },
              ];
              data[productIndex].notifications = [
                ...notifications,
                {
                  title: heading,
                  product: title,
                  message: message,
                  url: url,
                  timestamp: Date.now(),
                },
              ];

              // Update Firestore
              await updateDoc(userDocRef, { products: data });
            }
          }

          // Send email notification
          sendEmailNotification(
            email,
            title,
            url,
            extractedPriceNum,
            message,
            heading
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error checking price updates:", error);
    chrome.notifications.create(`error-${Date.now()}`, {
      type: "basic",
      iconUrl: "image/image.png",
      title: "Tracking Error",
      message: error.message,
      priority: 2,
    });
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

// chrome.storage.sync.get(["userId"], (result) => {
//   if (!result.userId) {
//     // No ID found, tell content script to show the input
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs.length > 0) {
//         chrome.tabs.sendMessage(tabs[0].id, {
//           action: "No Id",
//         });
//       }
//     });
//   } else {
//     // ID exists, tell content script to hide the input
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs.length > 0) {
//         chrome.tabs.sendMessage(tabs[0].id, {
//           action: "Has Id",
//           userId: result.userId, // Send the stored ID
//         });
//       }
//     });
//   }
// });
