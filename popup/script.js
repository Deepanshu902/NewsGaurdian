// popup.js

// Grab references to all the HTML elements we'll need to interact with
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('result');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessageSpan = document.getElementById('errorMessage');
const percentageP = document.getElementById('percentage');
const verdictP = document.getElementById('verdict');
const reasonsUl = document.getElementById('reasons');

// --- Main Event Listener ---

// Listen for clicks on the "Analyze" button
analyzeBtn.addEventListener('click', () => {
  // Get the current active tab in the browser
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) {
        showError("Could not find an active tab.");
        return;
    }

    // Use the Chrome Scripting API to execute a function on the page
    // This is the modern, secure way to get information from the web page
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        function: getSelectedText,
      },
      (injectionResults) => {
        // The result of the injected script is an array
        if (chrome.runtime.lastError) {
            showError(chrome.runtime.lastError.message);
            return;
        }
        
        const selectedText = injectionResults[0].result;

        if (selectedText && selectedText.trim().length > 0) {
          // If we got text, show the loading spinner and hide any old results
          showLoading();
          
          // Send a message to the background script with the text to analyze
          chrome.runtime.sendMessage(
            { type: 'ANALYZE_TEXT', text: selectedText },
            (response) => {
              // This is the callback function that runs when the background script replies
              hideLoading();
              if (response.error) {
                showError(response.error);
              } else {
                displayResult(response);
              }
            }
          );
        } else {
          showError("No text selected. Please highlight some text on the page to analyze.");
        }
      }
    );
  });
});

// --- Helper Functions ---

/**
 * This function is injected into the webpage to get the currently selected text.
 * @returns {string} The selected text.
 */
function getSelectedText() {
  return window.getSelection().toString();
}

/**
 * Displays the analysis result in the popup window.
 * @param {object} data The analysis data from the AI.
 * @param {number} data.percentage The likelihood of being fake news.
 * @param {string[]} data.reasons The reasons for the analysis.
 */
function displayResult(data) {
    resultDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');

    const percentage = data.percentage || 0;
    percentageP.textContent = `${percentage}% Fake`;

    if (percentage > 75) {
        verdictP.textContent = "Very Likely Misinformation";
        percentageP.className = "text-2xl font-bold text-center text-red-600";
    } else if (percentage > 50) {
        verdictP.textContent = "Potentially Misleading";
        percentageP.className = "text-2xl font-bold text-center text-yellow-600";
    } else {
        verdictP.textContent = "Likely Authentic";
        percentageP.className = "text-2xl font-bold text-center text-green-600";
    }

    reasonsUl.innerHTML = ''; // Clear previous reasons
    if (data.reasons && data.reasons.length > 0) {
        data.reasons.forEach(reason => {
            const li = document.createElement('li');
            li.textContent = reason;
            reasonsUl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "No specific reasons provided.";
        reasonsUl.appendChild(li);
    }
}

/**
 * Shows the loading indicator and hides other elements.
 */
function showLoading() {
  loadingDiv.classList.remove('hidden');
  resultDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
  loadingDiv.classList.add('hidden');
}

/**
 * Displays an error message in the popup.
 * @param {string} message The error message to show.
 */
function showError(message) {
    hideLoading();
    resultDiv.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorMessageSpan.textContent = message;
}
