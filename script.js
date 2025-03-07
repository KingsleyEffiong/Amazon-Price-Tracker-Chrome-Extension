// Function to check if we're on an Amazon product page
function isAmazonProductPage() {
  return (
    window.location.href.includes("/dp/") ||
    window.location.href.includes("/gp/product/")
  );
}

const userId = localStorage.getItem("userId");
// Only run the script if it's a product page
if (isAmazonProductPage()) {
  // Create the floating tracker icon
  const tracker = document.createElement("div");
  tracker.id = "tracker";
  tracker.style.position = "fixed";
  tracker.style.bottom = "15px";
  tracker.style.left = "15px";
  tracker.style.zIndex = "100000000";
  tracker.style.cursor = "pointer";
  tracker.style.background = "#0f1111";
  tracker.style.borderRadius = "50%";
  tracker.style.padding = "10px";
  tracker.style.display = "flex";
  tracker.style.alignItems = "center";
  tracker.style.justifyContent = "center";
  tracker.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  tracker.style.animation = "spin 3s linear infinite";

  // SVG Tracker Icon
  tracker.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
        <path fill="white" d="M12 2C8.13 2 5 5.13 5 9c0 4.21 5.56 10.9 6.16 11.64a1 1 0 0 0 1.68 0C13.44 19.9 19 13.21 19 9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5 0 2.97-3.52 7.82-5 9.76C10.52 16.82 7 11.97 7 9c0-2.76 2.24-5 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
      </svg>
    `;

  // Append icon to the page
  document.body.appendChild(tracker);

  // Add spinning animation
  const style = document.createElement("style");
  style.innerHTML = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
  document.head.appendChild(style);

  // === Create a stylish modal popup ===
  const container = document.createElement("div");
  container.id = "urlPopup";
  container.style.position = "fixed";
  container.style.bottom = "70px";
  container.style.left = "15px";
  container.style.width = "260px";
  container.style.padding = "15px";
  container.style.borderRadius = "12px";
  container.style.backgroundColor = "#0f1111";
  container.style.color = "white";
  container.style.fontSize = "14px";
  container.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
  container.style.display = "none"; // Hidden by default
  container.style.opacity = "0";
  container.style.transition = "opacity 0.3s ease-in-out";

  // Append popup to page
  document.body.appendChild(container);

  // Function to extract product details
  function extractProductData() {
    if (!isAmazonProductPage()) {
      console.log("Not amazon web page");
      return;
    } else {
      console.log("It is an amazon web page");
    }

    try {
      const title = document.querySelector("#productTitle")?.innerText.trim();
      let price = document
        .querySelector(".a-price-whole")
        ?.innerText.trim()
        .replace(".", "");
      console.log(price);
      const priceSymbol = document
        .querySelector(".a-price-symbol")
        ?.innerText.trim();
      const pricePercentage = document
        .querySelector(".a-price-fraction")
        ?.innerText.trim();
      const image = document.querySelector("#landingImage")?.src;
      const imageAlt = document.querySelector("#landingImage img")?.alt;
      const url = window.location.href;

      console.log(title, price, image);
      // Ensure extracted data is valid
      if (title && price && image) {
        // Populate the modal with extracted data
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>Track this product price</strong>
              <button id="closePopup" style="
                background: none;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
              ">✖</button>
            </div>
            <div style="text-align: center; margin-top: 10px;">
              <img src="${image}" alt="${imageAlt}" style="width: 200px; border-radius: 8px; max-height:180px" />
              <h2 style="margin: 10px 0; font-size: 16px;">${title.slice(
                0,
                22
              )}.....</h2>
              <p style="font-size: 14px; text-align:left">Price: ${priceSymbol}${price}.${
          pricePercentage || "00"
        } cent</p>
            </div>
      <p style="font-size: 14px; text-align: left;">
      If the current price is higher. Please enter your preferred price below, and we'll notify you if the product's price drops to your desired amount.
    </p>
    <div style="display:flex; flex-direction:column; gap: 6px; justify-content-center; align-items:center">
        <input
      type="text"
      placeholder="Enter email account to get price updated"
      id="email"
      style="width: 100%; outline: none; border: none;"
      autofocus
    />
<input
      type="text"
      placeholder="Enter your desired price"
      id="userPrice"
      style="width: 100%; outline: none; border: none;"
      autofocus
    />
<input
      type="text"
      placeholder="Tracking Id"
      id="userId"
      style="width: 100%; outline: none; border: none;"
      autofocus
    />
    </div>
    
            <button id="saveUrl" style="
              margin-top: 10px;
              width: 100%;
              padding: 8px;
              background-color: #fff;
              color: #180d1b;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              transition: background 0.3s;
            ">Track this product</button>
          `;

        // Show the modal
        container.style.display = "block";
        setTimeout(() => {
          container.style.opacity = "1";
        }, 50);

        if (userId) {
          const userIdInput = document.getElementById("userId");
          console.log(userIdInput);
          if (userIdInput) {
            userIdInput.style.display = "none";
          } else {
            // Do nothing, or add a log for debugging
            console.error("Element with id 'userId' not found");
          }
        }
        if (!userId) {
          chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
              if (message.action === "sendUserId") {
                localStorage.setItem("userId", message.userId);
              }
            }
          );
        }
        // Close modal event
        document
          .getElementById("closePopup")
          .addEventListener("click", function () {
            container.style.opacity = "0";
            setTimeout(() => {
              container.style.display = "none";
            }, 300);
          });

        // Save product details to background script
        document
          .getElementById("saveUrl")
          .addEventListener("click", function () {
            const userPrice =
              document.getElementById("userPrice")?.value || "0";
            const email = document.getElementById("email")?.value || "";
            const inputField = document.getElementById("userId");

            const messageData = {
              title,
              price,
              priceSymbol,
              pricePercentage,
              image,
              url,
              userPrice,
              email,
            };

            // If userId input exists, add it to the data
            if (inputField) {
              const userId = inputField.value.trim().toLowerCase();
              if (userId) {
                messageData.userId = userId;
              }
            }

            if (!email.trim() || !userPrice.trim()) {
              alert("Please fill in all required fields.");
              return;
            }

            chrome.runtime.sendMessage({
              action: "saveProduct",
              data: messageData, // Send the object dynamically
            });

            container.style.opacity = "0";
            setTimeout(() => {
              container.style.display = "none";
            }, 300);
          });
      }
    } catch (error) {
      console.error("Error extracting product data:", error);
      alert("Error extracting product data:", error);
    }
  }

  // Click event on tracker to extract product details first before showing the modal
  tracker.addEventListener("click", function () {
    extractProductData();
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractData") {
      extractProductData();
    }
  });
}

function parseProductPage() {
  const productTitleElement = document.querySelector("#productTitle, #title");
  const priceElement = document.querySelector(".a-price-whole");

  if (productTitleElement && priceElement) {
    const title = productTitleElement.textContent.trim();
    const price = priceElement.textContent.replace(/[^0-9.-]+/g, "");
    return { title, price };
  }
  return null;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseProductPage") {
    const productData = parseProductPage();
    sendResponse(productData);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseAmazonHTML") {
    // ✅ Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, "text/html");

    // ✅ Extract Amazon price
    let priceWhole = doc.querySelector(".a-price-whole");
    console.log(priceWhole);
    if (priceWhole) {
      let price = priceWhole.textContent.replace(".", "").trim();
      console.log(price);

      // ✅ Send extracted price back to background script
      chrome.runtime.sendMessage({
        action: "updatePrice",
        price: price,
        url: message.url,
      });
    } else {
      // console.log("❌ Price not found on the page.");
      alert("❌ Price not found on the page.");
    }
  }
});
