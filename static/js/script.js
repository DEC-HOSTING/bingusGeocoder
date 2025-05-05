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
    // Add element for the thinking bubble
    const thinkingBubble = document.getElementById('thinking-bubble');
    console.log("DEBUG: thinkingBubble element:", thinkingBubble ? "Found" : "NOT FOUND");
    // Random Popup
    const popupOverlay = document.getElementById('random-popup-overlay'); const popupModal = document.getElementById('random-popup-modal'); const popupMessage = document.getElementById('random-popup-message'); const closePopupButton = document.getElementById('close-popup-button'); const closePopupButtonX = document.getElementById('close-popup-button-x');
    console.log("DEBUG: Random Popup elements:", popupOverlay && popupModal && popupMessage ? "Found" : "Some NOT FOUND!"); // Added check
    // Summary Popup
    const summaryPopupOverlay = document.getElementById('summary-popup-overlay'); const summaryPopupModal = document.getElementById('summary-popup-modal'); const summaryPopupContent = document.getElementById('summary-popup-content'); const closeSummaryPopupButton = document.getElementById('close-summary-popup-button'); const closeSummaryPopupButtonX = document.getElementById('close-summary-popup-button-x');
    console.log("DEBUG: Summary Popup elements:", summaryPopupOverlay && summaryPopupModal && summaryPopupContent ? "Found" : "Some NOT FOUND");

    // --- State Variables ---
    let isTyping = false; let randomPopupCount = 0; const MAX_RANDOM_POPUPS = 2;
    let potentialPopupMessages = ["Default: Looking fabulous today! ✨", "Default: Data slayer! 🔥"];
    let bingusMessageCount = 0;

    // --- Helper: Remove Quick Replies ---
    function removeQuickReplies() {
        const quickReplies = chatMessages?.querySelectorAll('div.flex.gap-2, div.flex.flex-wrap.gap-2');
        if (quickReplies) quickReplies.forEach(qr => qr.remove());
    }

    // --- Fancy Bingus Thinking Modal Logic ---
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

    // --- Typewriter Effect for Bingus ---
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

    // --- Display Message ---
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
            strong.textContent = 'You: '; strong.classList.add('text-deep-purple'); messageWrapper.classList.add('text-right');
        } else {
            messageElement.classList.add('text-left', 'mr-8', 'bg-gray-200', 'p-3', 'rounded-lg', 'rounded-bl-none', 'shadow-sm', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
            strong.textContent = sender + ': '; strong.classList.add('text-gray-700'); messageWrapper.classList.add('text-left');
        }
        messageElement.appendChild(strong);
        messageElement.appendChild(document.createTextNode(message || ""));
        messageWrapper.appendChild(messageElement);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }

    // --- Send Chat Message ---
    async function sendChatMessage() {
        const messageText = chatInput.value.trim();
        const userName = localStorage.getItem('bingusUserName') || 'Gorgeous';
        if (!messageText) return;
        displayMessage('You', messageText);
        chatInput.value = '';
        removeQuickReplies();
        try {
            showTypingIndicator();
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, userName: userName })
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
            displayMessage('Bingus ✨', '😿 Yikes! Connection trouble.');
        }
    }

    // --- Event Listeners ---
    if (sendChatButton) {
        sendChatButton.addEventListener('click', () => sendChatMessage());
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChatMessage();
            }
        });
    }
});