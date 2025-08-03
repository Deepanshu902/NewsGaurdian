document.addEventListener('DOMContentLoaded', () => {
    // Button and DOM elements
    const analyzeBtn = document.getElementById('analyzeBtn');
    const instructionText = document.getElementById('instructionText');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessageSpan = document.getElementById('errorMessage');
    const percentageP = document.getElementById('percentage');
    const verdictP = document.getElementById('verdict');
    const reasonsUl = document.getElementById('reasons');

    // Helper: Set button enabled/disabled & style explicitly
    function setButtonState(isEnabled) {
        analyzeBtn.disabled = !isEnabled;
        if (isEnabled) {
            analyzeBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            analyzeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        } else {
            analyzeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            analyzeBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        }
    }

    // Returns selected text as string (injected into page)
    function getSelectedText() {
        return window.getSelection().toString().trim();
    }

    // Query for selected text & update button
    function checkSelectionAndUpdateUI() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        function: getSelectedText,
                    },
                    (injectionResults) => {
                        if (chrome.runtime.lastError) {
                            setButtonState(false);
                            instructionText.textContent = "Select text on a page to enable analysis.";
                            return;
                        }
                        const textSelected = injectionResults && injectionResults[0] && injectionResults[0].result;
                        if (textSelected) {
                            setButtonState(true);
                            instructionText.textContent = "Text selected! Click Analyze to continue.";
                        } else {
                            setButtonState(false);
                            instructionText.textContent = "Select text on a page to enable analysis.";
                        }
                    }
                );
            } else {
                setButtonState(false);
                instructionText.textContent = "Cannot analyze text on this page.";
            }
        });
    }

    // On DOM ready, verify initial button state
    checkSelectionAndUpdateUI();

    // Listen for clicks on Analyze
    analyzeBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: getSelectedText,
                },
                (injectionResults) => {
                    const selectedText = injectionResults[0].result;
                    if (selectedText) {
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
                        showError("The selected text was lost. Please select it again.");
                        setButtonState(false);
                        instructionText.textContent = "Select text on a page to enable analysis.";
                    }
                }
            );
        });
    });

    // Helper functions for UI
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

    // Optional: listen for focus (when popup/body refocuses, try to update button state)
    window.addEventListener('focus', checkSelectionAndUpdateUI);

});
