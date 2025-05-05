document.addEventListener('DOMContentLoaded', () => {
    // Added logs to verify element finding and function calls
    console.log("DEBUG: DOM fully loaded and parsed.");

    // --- DOM Elements ---
    const uploadForm = document.getElementById('upload-form');
    console.log("DEBUG: uploadForm element:", uploadForm ? "Found" : "NOT FOUND");
    const fileInput = document.getElementById('file-input');
    console.log("DEBUG: fileInput element:", fileInput ? "Found" : "NOT FOUND");
    const fileNameDisplay = document.getElementById('file-name-display');
    console.log("DEBUG: fileNameDisplay element:", fileNameDisplay ? "Found" : "NOT FOUND");
    const submitButton = document.getElementById('submit-button');
    console.log("DEBUG: submitButton element:", submitButton ? "Found" : "NOT FOUND");
    const progressIndicator = document.getElementById('progress-indicator');
    console.log("DEBUG: progressIndicator element:", progressIndicator ? "Found" : "NOT FOUND");
    const progressBarFill = document.getElementById('progress-bar-fill');
    console.log("DEBUG: progressBarFill element:", progressBarFill ? "Found" : "NOT FOUND");
    const resultArea = document.getElementById('result-area');
    console.log("DEBUG: resultArea element:", resultArea ? "Found" : "NOT FOUND");
    const downloadLink = document.getElementById('download-link');
    console.log("DEBUG: downloadLink element:", downloadLink ? "Found" : "NOT FOUND");
    const errorArea = document.getElementById('error-area');
    console.log("DEBUG: errorArea element:", errorArea ? "Found" : "NOT FOUND");
    const errorMessage = document.getElementById('error-message');
    console.log("DEBUG: errorMessage element:", errorMessage ? "Found" : "NOT FOUND");
    const chatMessages = document.getElementById('chat-messages');
    console.log("DEBUG: chatMessages element:", chatMessages ? "Found" : "NOT FOUND");
    const chatInput = document.getElementById('chat-input');
    console.log("DEBUG: chatInput element:", chatInput ? "Found" : "NOT FOUND");
    const sendChatButton = document.getElementById('send-chat-button');
    console.log("DEBUG: sendChatButton element:", sendChatButton ? "Found" : "NOT FOUND");
    const typingIndicator = document.getElementById('typing-indicator');
    console.log("DEBUG: typingIndicator element:", typingIndicator ? "Found" : "NOT FOUND");
    const thinkingBubble = document.getElementById('thinking-bubble');
    console.log("DEBUG: thinkingBubble element:", thinkingBubble ? "Found" : "NOT FOUND");
    const popupOverlay = document.getElementById('random-popup-overlay');
    const popupModal = document.getElementById('random-popup-modal');
    const popupMessage = document.getElementById('random-popup-message');
    const closePopupButton = document.getElementById('close-popup-button');
    const closePopupButtonX = document.getElementById('close-popup-button-x');
    console.log("DEBUG: Random Popup elements:", popupOverlay && popupModal && popupMessage ? "Found" : "Some NOT FOUND!");
    const summaryPopupOverlay = document.getElementById('summary-popup-overlay');
    const summaryPopupModal = document.getElementById('summary-popup-modal');
    const summaryPopupContent = document.getElementById('summary-popup-content');
    const closeSummaryPopupButton = document.getElementById('close-summary-popup-button');
    const closeSummaryPopupButtonX = document.getElementById('close-summary-popup-button-x');
    console.log("DEBUG: Summary Popup elements:", summaryPopupOverlay && summaryPopupModal && summaryPopupContent ? "Found" : "Some NOT FOUND");
    const namePromptOverlay = document.getElementById('name-prompt-overlay');
    const namePromptModal = document.getElementById('name-prompt-modal');
    const nameInput = document.getElementById('name-input');
    const submitNameButton = document.getElementById('submit-name-button');
    console.log("DEBUG: Name Prompt elements:", namePromptOverlay && namePromptModal && nameInput && submitNameButton ? "Found" : "Some NOT FOUND");

    // --- State Variables ---
    let isTyping = false;
    let randomPopupCount = 0;
    const MAX_RANDOM_POPUPS = 2;
    let potentialPopupMessages = ["Default: Looking fabulous today! ✨", "Default: Data slayer! 🔥"];
    let bingusMessageCount = 0;
    let userName = localStorage.getItem('bingusUserName') || null;

    // --- Helper Functions ---
    function removeQuickReplies() {
        const quickReplies = chatMessages?.querySelectorAll('div.flex.gap-2, div.flex.flex-wrap.gap-2');
        if (quickReplies) quickReplies.forEach(qr => qr.remove());
    }

    function showElement(element) {
        if (element) element.classList.remove('hidden');
    }

    function hideElement(element) {
        if (element) element.classList.add('hidden');
    }

    function showOpacityElement(element) {
        if (!element) return;
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.remove('opacity-0', 'scale-95');
            element.classList.add('opacity-100', 'scale-100');
        }, 10);
    }

    function hideOpacityElement(element) {
        if (!element) return;
        element.classList.remove('opacity-100', 'scale-100');
        element.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 300);
    }

    function updateProgressBar(percentage) {
        if (progressBarFill) {
            progressBarFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }

    const bingusThinkingModal = document.getElementById('bingus-thinking-modal');
    const bingusThinkingContent = document.getElementById('bingus-thinking-content');
    function showBingusThinkingModal(thinkingText) {
        if (!bingusThinkingModal || !bingusThinkingContent) return;
        bingusThinkingContent.textContent = thinkingText || 'Bingus is pondering...';
        bingusThinkingModal.classList.remove('hidden', 'opacity-0');
        bingusThinkingModal.classList.add('opacity-100');
        let dotCount = 0;
        if (bingusThinkingModal.fancyInterval) clearInterval(bingusThinkingModal.fancyInterval);
        const dotsSpan = bingusThinkingModal.querySelector('.fancy-dots');
        bingusThinkingModal.fancyInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 3;
            if (dotsSpan) dotsSpan.textContent = '💭'.repeat(dotCount + 1);
        }, 400);
    }
    function hideBingusThinkingModal() {
        if (!bingusThinkingModal) return;
        bingusThinkingModal.classList.remove('opacity-100');
        bingusThinkingModal.classList.add('opacity-0');
        setTimeout(() => {
            bingusThinkingModal.classList.add('hidden');
            if (bingusThinkingModal.fancyInterval) clearInterval(bingusThinkingModal.fancyInterval);
            const dotsSpan = bingusThinkingModal.querySelector('.fancy-dots');
            if (dotsSpan) dotsSpan.textContent = '💭💭';
            if (bingusThinkingContent) bingusThinkingContent.textContent = '';
        }, 300);
    }

    function showTypingIndicator() {
        if (typingIndicator) typingIndicator.classList.remove('hidden');
    }

    function hideTypingIndicator() {
        if (typingIndicator) typingIndicator.classList.add('hidden');
    }

    function typewriterMessage(sender, message, callback) {
        if (!chatMessages) return;
        const aiSpeaker = 'Bingus ✨';
        const messageWrapper = document.createElement('div');
        const messageElement = document.createElement('p');
        const strong = document.createElement('strong');
        messageWrapper.classList.add('animate-fade-in-up', 'transition-all', 'duration-500', 'text-left');
        messageElement.classList.add('text-left', 'mr-8', 'bg-white', 'bg-opacity-90', 'p-3', 'rounded-lg', 'rounded-bl-none', 'shadow-md', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
        strong.textContent = aiSpeaker + ': ';
        strong.classList.add('text-bubblegum-pink');
        messageElement.appendChild(strong);
        const span = document.createElement('span');
        messageElement.appendChild(span);
        messageWrapper.appendChild(messageElement);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        let i = 0;
        const typingSpeed = 15 + Math.random() * 30;
        setTimeout(() => {
            function type() {
                if (i < message.length) {
                    span.innerHTML = message.slice(0, i + 1);
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                    i++;
                    setTimeout(type, typingSpeed);
                } else {
                    if (callback) callback();
                }
            }
            type();
        }, 100);
    }

    function displayMessage(sender, message, imageUrl = null) {
        if (!chatMessages) return;
        if (sender === 'Bingus ✨') {
            typewriterMessage(sender, message);
            return;
        }
        const messageWrapper = document.createElement('div');
        const messageElement = document.createElement('p');
        const strong = document.createElement('strong');
        messageWrapper.classList.add('animate-fade-in-up', 'transition-all', 'duration-500');
        if (sender === 'You') {
            messageElement.classList.add('text-right', 'ml-8', 'bg-purple-100', 'p-3', 'rounded-lg', 'rounded-br-none', 'shadow-sm', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
            strong.textContent = 'You: ';
            strong.classList.add('text-deep-purple');
            messageWrapper.classList.add('text-right');
        } else {
            messageElement.classList.add('text-left', 'mr-8', 'bg-gray-200', 'p-3', 'rounded-lg', 'rounded-bl-none', 'shadow-sm', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
            strong.textContent = sender + ': ';
            strong.classList.add('text-gray-700');
            messageWrapper.classList.add('text-left');
        }
        messageElement.appendChild(strong);
        messageElement.appendChild(document.createTextNode(message || ""));
        messageWrapper.appendChild(messageElement);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

    async function sendChatMessage() {
        const messageText = chatInput.value.trim();
        const currentUserName = userName || 'Gorgeous';
        if (!messageText) return;
        displayMessage('You', messageText);
        chatInput.value = '';
        removeQuickReplies();
        try {
            showTypingIndicator();
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, userName: currentUserName })
            });
            hideTypingIndicator();
            const data = await response.json();
            if (data.thinking) {
                showBingusThinkingModal(data.thinking);
                await new Promise(resolve => setTimeout(resolve, 1200 + Math.min(2000, data.thinking.length * 15)));
                hideBingusThinkingModal();
            }
            if (data.response) {
                displayMessage('Bingus ✨', data.response);
            } else if (data.error) {
                displayMessage('Bingus ✨', `😿 ${data.error}`);
            } else {
                displayMessage('Bingus ✨', 'Bingus seems lost for words...');
            }
        } catch (error) {
            hideTypingIndicator();
            hideBingusThinkingModal();
            console.error("Chat Error:", error);
            displayMessage('Bingus ✨', '😿 Yikes! Connection trouble.');
        }
    }

    async function handleFileUpload(event) {
        event.preventDefault();
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            if (errorMessage) errorMessage.textContent = 'Please select a file first, darling!';
            showElement(errorArea);
            hideElement(resultArea);
            hideElement(progressIndicator);
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        hideElement(errorArea);
        hideElement(resultArea);
        showElement(progressIndicator);
        updateProgressBar(0);
        if (submitButton) submitButton.disabled = true;
        if (submitButton) submitButton.textContent = 'Purrrrocessing...';

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                updateProgressBar(progress);
            }
        }, 200);

        try {
            const response = await fetch('/process-excel', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            updateProgressBar(100);

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                if (downloadLink) {
                    downloadLink.href = downloadUrl;
                    const disposition = response.headers.get('Content-Disposition');
                    let filename = `processed_${file.name}`;
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }
                    downloadLink.download = filename;
                }
                showElement(resultArea);
                hideElement(errorArea);
                fetchAndShowSummary();
            } else {
                const errorData = await response.json();
                let errorText = errorData.error || 'An unknown error occurred.';
                if (errorData.ai_message && errorData.ai_message.response) {
                    errorText += ` Bingus says: "${errorData.ai_message.response}"`;
                }
                if (errorMessage) errorMessage.textContent = errorText;
                showElement(errorArea);
                hideElement(resultArea);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Upload Error:', error);
            if (errorMessage) errorMessage.textContent = 'Oh no! A network error occurred during upload.';
            showElement(errorArea);
            hideElement(resultArea);
        } finally {
            if (submitButton) submitButton.disabled = false;
            if (submitButton) submitButton.textContent = '✨ Process! ✨';
            setTimeout(() => {
                hideElement(progressIndicator);
            }, 1000);
        }
    }

    async function fetchAndShowSummary() {
        try {
            const response = await fetch('/get-processing-summary');
            if (!response.ok) throw new Error('Failed to fetch summary');
            const summary = await response.json();

            console.log("DEBUG: Fetched processing summary:", summary); // Log summary for debugging

            // Check if summary data exists and the necessary elements are present
            if (summary && Object.keys(summary).length > 0 && summaryPopupOverlay && summaryPopupContent && summaryPopupModal) {
                // Populate the modal content with the summary data
                summaryPopupContent.innerHTML = `
                    <h3 class="text-lg font-semibold mb-3 text-bubblegum-pink">Processing Summary</h3>
                    <p class="mb-1"><strong>File:</strong> ${summary.filename || 'N/A'}</p>
                    <p class="mb-1"><strong>Total Rows Processed:</strong> ${summary.total_rows ?? 'N/A'}</p>
                    <p class="text-green-600 mb-1"><strong>Successful:</strong> ${summary.success_count ?? 'N/A'}</p>
                    <p class="text-red-600 mb-1"><strong>Failed:</strong> ${summary.fail_count ?? 'N/A'}</p>
                    <p class="text-purple-600 mb-1"><strong>AI Assist Attempts:</strong> ${summary.ai_assist_attempt ?? 'N/A'}</p>
                    <p class="text-blue-600"><strong>AI Assist Successes:</strong> ${summary.ai_assist_success ?? 'N/A'}</p>
                `;

                // Show the overlay and the modal
                showOpacityElement(summaryPopupOverlay);
                // Ensure the modal itself is also made visible if it's controlled separately
                showOpacityElement(summaryPopupModal);

            } else {
                console.log("No summary data received or popup elements missing.");
            }
        } catch (error) {
            console.error('Error fetching or displaying summary:', error);
            // Optionally inform the user that the summary couldn't be displayed
            // displayMessage('Bingus ✨', '😿 Oops! Couldn\'t show the summary this time.');
        }
    }

    function handleNamePrompt() {
        if (!userName && namePromptOverlay) {
            showOpacityElement(namePromptOverlay);
        }

        if (submitNameButton && nameInput) {
            const submitAction = () => {
                const enteredName = nameInput.value.trim();
                if (enteredName) {
                    userName = enteredName;
                    localStorage.setItem('bingusUserName', userName);
                    hideOpacityElement(namePromptOverlay);
                    displayMessage('Bingus ✨', `Hey ${userName}! So fabulous to meet you! Ask me anything or drop your file! 💖`);
                } else {
                    nameInput.placeholder = "Don't be shy, enter a name!";
                    nameInput.classList.add('border-red-500');
                }
            };
            submitNameButton.addEventListener('click', submitAction);
            nameInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    submitAction();
                }
            });
        }
    }

    handleNamePrompt();

    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileNameDisplay.textContent = fileInput.files[0].name;
                hideElement(errorArea);
                hideElement(resultArea);
            } else {
                fileNameDisplay.textContent = 'No file chosen...';
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }

    if (sendChatButton) {
        sendChatButton.addEventListener('click', sendChatMessage);
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage();
            }
        });
    }

    if (closeSummaryPopupButton) {
        closeSummaryPopupButton.addEventListener('click', () => hideOpacityElement(summaryPopupOverlay));
    }
    if (closeSummaryPopupButtonX) {
        closeSummaryPopupButtonX.addEventListener('click', () => hideOpacityElement(summaryPopupOverlay));
    }
    if (summaryPopupOverlay) {
        summaryPopupOverlay.addEventListener('click', (event) => {
            if (event.target === summaryPopupOverlay) {
                hideOpacityElement(summaryPopupOverlay);
            }
        });
    }

    if (userName && chatMessages && chatMessages.children.length === 0) {
        displayMessage('Bingus ✨', `Welcome back, ${userName}! Ready to slay some data? ✨`);
    }
});