document.addEventListener('DOMContentLoaded', () => {
    

    const analyzeBtn = document.getElementById('analyzeBtn');
    const instructionText = document.getElementById('instructionText');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessageSpan = document.getElementById('errorMessage');
    const percentageP = document.getElementById('percentage');
    const verdictP = document.getElementById('verdict');
    const reasonsUl = document.getElementById('reasons');

    // --- Function to get selected text (will be injected into the page) ---
    function getSelectedText() {
        // Using trim() to ensure whitespace-only selections are ignored
        return window.getSelection().toString().trim();
    }

    // --- Check for selected text as soon as the popup opens ---
    // This logic now explicitly enables or disables the button.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // A tab might not be available (e.g., on the new tab page).
        if (tabs && tabs[0]) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: getSelectedText,
                },
                (injectionResults) => {
                    // It's good practice to check for injection errors.
                    if (chrome.runtime.lastError) {
                        console.warn("NewsGuardian: Could not check for selected text. " + chrome.runtime.lastError.message);
                        analyzeBtn.disabled = true;
                        instructionText.textContent = "Select text on a page to enable analysis.";
                        return;
                    }

                    // The result will be an empty string if nothing is selected (or was trimmed).
                    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                        // Text IS selected
                        analyzeBtn.disabled = false;
                        instructionText.textContent = "Text selected! Click Analyze to continue.";
                    } else {
                        // Text IS NOT selected
                        analyzeBtn.disabled = true;
                        instructionText.textContent = "Select text on a page to enable analysis.";
                    }
                }
            );
        } else {
            // This handles cases where there's no active tab to inject into.
            analyzeBtn.disabled = true;
            instructionText.textContent = "Cannot analyze text on this page.";
        }
    });

    // --- Listen for clicks on the "Analyze" button ---
    // This will only fire if the button is NOT disabled.
    analyzeBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: getSelectedText,
                },
                (injectionResults) => {
                    // Re-check for text in case it was deselected.
                    const selectedText = injectionResults[0].result;
                    if (selectedText) { // The injected function now trims, so this check is sufficient.
                        showLoading();
                        chrome.runtime.sendMessage(
                            { type: 'ANALYZE_TEXT', text: selectedText },
                            (response) => {
                                hideLoading();
                                if (response.error) {
                                    showError(response.error);
                                } else {
                                    displayResult(response);
                                }
                            }
                        );
                    } else {
                        // This is a fallback in case the selection disappears.
                        showError("The selected text was lost. Please select it again.");
                        analyzeBtn.disabled = true; // Re-disable it.
                        instructionText.textContent = "Select text on a page to enable analysis.";
                    }
                }
            );
        });
    });

    // --- Helper functions to show/hide elements ---
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
        reasonsUl.innerHTML = '';
        if (data.reasons && data.reasons.length > 0) {
            data.reasons.forEach(reason => {
                const li = document.createElement('li');
                li.textContent = reason;
                reasonsUl.appendChild(li);
            });
        }
    }

    function showLoading() {
        loadingDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
    }

    function hideLoading() {
        loadingDiv.classList.add('hidden');
    }

    function showError(message) {
        hideLoading();
        resultDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
        errorMessageSpan.textContent = message;
    }
});
