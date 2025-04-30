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
    // Updated default messages slightly
    let potentialPopupMessages = ["Default: Looking fabulous today! ✨", "Default: Data slayer! 🔥"];
    let fakeProgressInterval = null; const ESTIMATED_PROCESSING_TIME_MS = 15000;

    // --- Bingus Emotes, Fun Facts, Quick Replies, and Sound ---
const bingusEmotes = [
    '😸', '😻', '😹', '✨', '💅', '👑', '🎉', '💖', '🔥', '🐾',
    '<img src="/static/images/kitten1.png" alt="Bingus emote" class="inline w-8 h-8 rounded-full align-middle" style="vertical-align:middle;">'
];
const bingusFunFacts = [
    "Did you know? Sphynx cats are not actually hairless—they have a fine peach fuzz!",
    "Bingus loves bubble baths and fashion shows!",
    "Sphynx cats are known for their friendly, energetic personalities.",
    "Bingus's favorite color is bubblegum pink!",
    "Sphynx cats need regular baths because they get oily skin.",
    "Bingus can slay a runway and a spreadsheet!",
    "Fun fact: Sphynx cats are very cuddly and love warmth!"
];
const bingusSounds = [
    '/static/sounds/meow1.mp3',
    '/static/sounds/meow2.mp3',
    '/static/sounds/pop.mp3'
];
let bingusMessageCount = 0;
function playBingusSound() {
    const src = bingusSounds[Math.floor(Math.random() * bingusSounds.length)];
    const audio = new Audio(src);
    audio.volume = 0.25;
    audio.play();
}
function getRandomEmote() {
    return bingusEmotes[Math.floor(Math.random() * bingusEmotes.length)];
}
function maybeShowFunFact() {
    if (bingusMessageCount > 0 && bingusMessageCount % 4 === 0) {
        const fact = bingusFunFacts[Math.floor(Math.random() * bingusFunFacts.length)];
        displayMessage('Bingus ✨', `💡 <span class="text-bubblegum-pink font-bold">Bingus Fact:</span> ${fact}`);
    }
}
function showQuickReplies(options) {
    if (!chatMessages) return;
    const quickReplyDiv = document.createElement('div');
    quickReplyDiv.className = 'flex gap-2 mt-2 mb-2';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'bg-bubblegum-pink text-white px-3 py-1 rounded-full font-semibold hover:scale-105 transform transition duration-200 shadow-sm text-sm';
        btn.textContent = opt.label;
        btn.onclick = () => {
            displayMessage('You', opt.text);
            chatInput.value = opt.text;
            sendChatMessage();
            quickReplyDiv.remove();
        };
        quickReplyDiv.appendChild(btn);
    });
    chatMessages.appendChild(quickReplyDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}
// --- Typewriter effect: start after short delay for perceived speed ---
function typewriterMessage(sender, message, callback) {
    if (!chatMessages) return;
    const aiSpeaker = 'Bingus ✨'; // Ensure this matches the sender name
    const messageWrapper = document.createElement('div');
    const messageElement = document.createElement('p');
    const strong = document.createElement('strong');

    // Styling for AI messages
    messageWrapper.classList.add('animate-fade-in-up', 'transition-all', 'duration-500', 'text-left'); // Ensure left alignment
    messageElement.classList.add('text-left', 'mr-8', 'bg-white', 'bg-opacity-90', 'p-3', 'rounded-lg', 'rounded-bl-none', 'shadow-md', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
    strong.textContent = aiSpeaker + ': ';
    strong.classList.add('text-bubblegum-pink');
    messageElement.appendChild(strong);

    const span = document.createElement('span'); // Content will be typed into this span
    messageElement.appendChild(span);
    messageWrapper.appendChild(messageElement);

    // --- FIX: Always append the message wrapper to the chatMessages container ---
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    // --- End FIX ---

    let i = 0;
    const typingSpeed = 15 + Math.random() * 30; // Adjust speed slightly

    // Delay before starting typing
    setTimeout(() => {
        function type() {
            if (i < message.length) {
                // Use innerHTML to render emotes if they are HTML (like <img> tags)
                span.innerHTML = message.slice(0, i + 1);
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                i++;
                setTimeout(type, typingSpeed);
            } else {
                // Typing finished
                if (callback) callback(); // Execute callback after typing
            }
        }
        type(); // Start the typing animation
    }, 300 + Math.random() * 200); // Short delay before typing starts
}

// --- NEW: Function to display the thinking bubble ---
function displayThinkingBubble(thinkingText) {
    if (!thinkingBubble || !thinkingText) return;
    console.log("DEBUG: Displaying thinking bubble:", thinkingText);
    const bubbleContent = thinkingBubble.querySelector('#thinking-bubble-content');
    if (bubbleContent) {
        bubbleContent.textContent = thinkingText;
        thinkingBubble.classList.remove('hidden', 'opacity-0', 'scale-95');
        thinkingBubble.classList.add('opacity-100', 'scale-100', 'animate-scale-in');
        // Optional: Auto-hide after a few seconds if needed, but we hide it before showing the main message
    }
}

// --- NEW: Function to hide the thinking bubble ---
function hideThinkingBubble() {
    if (!thinkingBubble) return;
    console.log("DEBUG: Hiding thinking bubble.");
    thinkingBubble.classList.remove('opacity-100', 'scale-100', 'animate-scale-in');
    thinkingBubble.classList.add('opacity-0', 'scale-95', 'animate-scale-out');
    // Use setTimeout to add hidden class after animation
    setTimeout(() => {
        thinkingBubble.classList.add('hidden');
        const bubbleContent = thinkingBubble.querySelector('#thinking-bubble-content');
        if (bubbleContent) bubbleContent.textContent = ''; // Clear content
    }, 300); // Match animation duration
}

// Patch displayMessage for Bingus to add emotes, sound, fun facts, and quick replies
function displayMessage(sender, message, opts = {}) {
    const aiSpeaker = 'Bingus ✨';
    if (!chatMessages) { console.error("ERROR in displayMessage: chatMessages element is null!"); return; }

    // Check if the sender is the AI to trigger typewriter
    if (sender === aiSpeaker) {
        hideTypingIndicator(); // Hide indicator if it was shown
        bingusMessageCount++;
        let emote = getRandomEmote();
        let msgWithEmote = message;
        // Add emote only if it's not an image tag already
        if (!message.includes('<img') && Math.random() < 0.7) {
            msgWithEmote = emote + ' ' + message;
        }
        playBingusSound();
        // Call typewriterMessage for AI messages
        typewriterMessage(sender, msgWithEmote, () => {
            // Optional callback after typing finishes
            maybeShowFunFact(); // Show fun fact after message types out
            if (!opts.noQuickReplies && Math.random() < 0.7) {
                showQuickReplies([
                     { label: 'Slay!', text: 'Slay!' },
                     { label: 'Tell me more!', text: 'Tell me more, Bingus!' },
                     { label: 'Draw Bingus!', text: 'Draw Bingus!' }
                ]);
            }
        });
        return; // Important: Stop execution here for AI messages handled by typewriter
    }

    // --- This part handles non-AI messages (like 'You') ---
    const messageWrapper = document.createElement('div');
    const messageElement = document.createElement('p');
    const strong = document.createElement('strong');
    messageWrapper.classList.add('animate-fade-in-up', 'transition-all', 'duration-500');

    if (sender === 'You') {
        messageElement.classList.add('text-right', 'ml-8', 'bg-purple-100', 'p-3', 'rounded-lg', 'rounded-br-none', 'shadow-sm', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
        strong.textContent = 'You: '; strong.classList.add('text-deep-purple'); messageWrapper.classList.add('text-right');
    } else {
         // Fallback for other senders (though currently only 'You' and 'Bingus ✨' are used)
         // This part should technically not be reached if sender === aiSpeaker check works
        messageElement.classList.add('text-left', 'mr-8', 'bg-gray-200', 'p-3', 'rounded-lg', 'rounded-bl-none', 'shadow-sm', 'inline-block', 'max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'break-words');
        strong.textContent = sender + ': '; strong.classList.add('text-gray-700'); messageWrapper.classList.add('text-left');
    }

    messageElement.appendChild(strong);
    messageElement.appendChild(document.createTextNode(message || ""));
    messageWrapper.appendChild(messageElement);

    // --- FIX: Always append the message to the chatMessages container ---
    if (chatMessages) {
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        console.log("DEBUG: Non-AI Message appended to chat window.");
    } else {
        console.error("ERROR: chatMessages element missing when trying to append non-AI message.");
    }
    // --- End FIX ---
}

    function clearChatLoading() { console.log("DEBUG: clearChatLoading CALLED."); const loading = chatMessages?.querySelector('p.italic'); if (loading) { loading.remove(); console.log("DEBUG: 'Loading chat...' removed."); } else { console.log("DEBUG: 'Loading chat...' not found."); } }

    // --- Progress Functions ---
    function clearFakeProgress() { if (fakeProgressInterval) { clearInterval(fakeProgressInterval); fakeProgressInterval = null; console.log("DEBUG: Cleared fake progress interval."); } }
    function showProgress() {
        console.log("DEBUG: showProgress called"); clearFakeProgress();
        if (!progressBarFill) { console.error("ERROR: Progress bar fill element not found!"); } else { progressBarFill.style.transitionDuration = '0ms'; progressBarFill.style.width = '0%'; void progressBarFill.offsetWidth; progressBarFill.style.transitionDuration = '150ms'; console.log("DEBUG: Progress bar reset to 0%"); }
        if(progressIndicator) progressIndicator.classList.remove('hidden'); if(resultArea) resultArea.classList.add('hidden'); if(errorArea) errorArea.classList.add('hidden');
        if(submitButton) { submitButton.disabled = true; submitButton.classList.add('opacity-50', 'cursor-not-allowed'); submitButton.textContent = "Processing..."; }
        let startTime = Date.now(); console.log("DEBUG: Starting fake progress interval...");
        fakeProgressInterval = setInterval(() => {
            let elapsedTime = Date.now() - startTime; let progressPercent = (elapsedTime / ESTIMATED_PROCESSING_TIME_MS) * 100; let displayPercent = Math.min(progressPercent, 95);
            console.log(`DEBUG Interval: Elapsed=${elapsedTime}ms, Progress=${progressPercent.toFixed(1)}%, Display=${displayPercent.toFixed(1)}%`);
            if (progressBarFill) { progressBarFill.style.width = displayPercent + '%'; } else { console.error("ERROR Interval: Progress bar fill missing!"); clearFakeProgress(); return; }
            if (elapsedTime >= ESTIMATED_PROCESSING_TIME_MS) { console.log("DEBUG: Fake progress time elapsed."); clearFakeProgress(); }
        }, 150);
    }
    function hideProgress() { console.log("DEBUG: hideProgress called"); clearFakeProgress(); if(progressIndicator) progressIndicator.classList.add('hidden'); if (submitButton) { submitButton.disabled = false; submitButton.classList.remove('opacity-50', 'cursor-not-allowed'); submitButton.innerHTML = "✨ Let's Process! ✨"; } }
    function showError(message, aiMessage = null) { console.log("DEBUG: showError called"); clearFakeProgress(); hideTypingIndicator(); hideProgress(); if(errorMessage) errorMessage.textContent = message; if(errorArea) errorArea.classList.remove('hidden'); if(resultArea) resultArea.classList.add('hidden'); const aiSpeaker = 'Bingus ✨'; if (aiMessage) displayMessage(aiSpeaker, aiMessage); else displayMessage(aiSpeaker, "Oh no, drama!"); if(errorArea) errorArea.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    function showResult(fileBlob, filename) {
        console.log("DEBUG: showResult called"); clearFakeProgress(); hideTypingIndicator();
        if (progressBarFill) { progressBarFill.style.transitionDuration = '300ms'; progressBarFill.style.width = '100%'; console.log("DEBUG: Set progress bar to 100%"); }
        setTimeout(() => { if(progressIndicator) progressIndicator.classList.add('hidden'); }, 500);
        if(resultArea) resultArea.classList.remove('hidden'); if(errorArea) errorArea.classList.add('hidden');
        const url = URL.createObjectURL(fileBlob); if(downloadLink) { downloadLink.href = url; downloadLink.download = filename || 'processed.xlsx'; }
        fetchProcessingSummary(); const aiSpeaker = 'Bingus ✨'; displayMessage(aiSpeaker, "YAS QUEEN! 👑 File processed! Download below & check report!");
        if(resultArea) resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (submitButton) { submitButton.disabled = false; submitButton.classList.remove('opacity-50', 'cursor-not-allowed'); submitButton.innerHTML = "✨ Let's Process! ✨"; }
    }

    // --- Name Prompt Overlay: Robust logic to show, hide, and store user name ---
    const namePromptOverlay = document.getElementById('name-prompt-overlay');
    const namePromptModal = document.getElementById('name-prompt-modal');
    const nameInput = document.getElementById('name-input');
    const submitNameButton = document.getElementById('submit-name-button');
    let userName = null;

    function showNamePrompt() {
        if (namePromptOverlay && namePromptModal) {
            namePromptOverlay.classList.remove('hidden');
            namePromptOverlay.classList.remove('opacity-0');
            namePromptOverlay.classList.add('opacity-100');
            namePromptModal.classList.remove('opacity-0', 'scale-95');
            namePromptModal.classList.add('opacity-100', 'scale-100', 'animate-scale-in');
            setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
        }
    }
    function hideNamePrompt() {
        if (namePromptOverlay && namePromptModal) {
            namePromptOverlay.classList.add('hidden');
            namePromptOverlay.classList.remove('opacity-100');
            namePromptOverlay.classList.add('opacity-0');
            namePromptModal.classList.remove('opacity-100', 'scale-100', 'animate-scale-in', 'animate-scale-out');
            namePromptModal.classList.add('opacity-0', 'scale-95');
        }
    }
    function askForNameIfNeeded() {
        userName = localStorage.getItem('bingusUserName') || null;
        if (!userName) {
            showNamePrompt();
        } else {
            hideNamePrompt();
        }
    }
    if (submitNameButton) {
        submitNameButton.addEventListener('click', () => {
            const val = nameInput?.value?.trim();
            if (val && val.length > 1) {
                userName = val;
                localStorage.setItem('bingusUserName', userName);
                hideNamePrompt();
                displayMessage('Bingus ✨', `Yas, ${userName}! Let the slay begin! 💅`);
            } else {
                nameInput.classList.add('border-red-400');
                setTimeout(() => nameInput.classList.remove('border-red-400'), 1000);
                nameInput.focus();
            }
        });
    }
    if (nameInput) {
        nameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                submitNameButton.click();
            }
        });
    }
    // On load, always check if we need to ask for the name
    askForNameIfNeeded();

    // --- Enhanced Chat Message Sending ---
    async function sendChatMessage() {
        const message = chatInput?.value?.trim();
        if (!message) return;
        displayMessage('You', message);
        chatInput.value = '';
        chatInput.focus();
        showTypingIndicator(); // Show fancy typing indicator immediately
        hideThinkingBubble(); // Ensure any previous bubble is hidden

        // Detect image generation intent (keep existing logic)
        const imageTriggers = [
            'draw bingus', 'generate image', 'show me bingus', 'make a picture', 'create an image', 'fat sphynx cat', 'cat pic', 'cat image', 'bingus art', 'picture of bingus'
        ];
        const lowerMsg = message.toLowerCase();
        if (imageTriggers.some(trigger => lowerMsg.includes(trigger))) {
            await generateBingusImage(); // This function should also hide typing indicator
            return;
        }

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ message: message, userName: userName }),
            });
            const responseText = await response.text();
            console.log(`DEBUG: /chat response Status: ${response.status}, OK: ${response.ok}`);
            console.log(`DEBUG: /chat response text: ${responseText}`);

            if (!response.ok) {
                let eData = { error: `Server error:${response.status}`, message: responseText };
                try { eData = JSON.parse(responseText); } catch (e) { }
                throw new Error(eData.error || eData.message || `Server error:${response.status}`);
            }

            const data = JSON.parse(responseText);
            console.log("DEBUG: Parsed /chat data:", data);

            // --- NEW: Handle Thinking Bubble --- 
            if (data.thinking) {
                displayThinkingBubble(data.thinking);
                // Wait a bit before showing the final response
                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Wait 1.5-2.5 seconds
                hideThinkingBubble();
                // Short delay before typing starts after bubble hides
                await new Promise(resolve => setTimeout(resolve, 300)); 
            }
            // --- End NEW --- 

            hideTypingIndicator(); // Hide indicator *before* showing the final message
            const aiSpeaker = 'Bingus ✨';

            if (data.response) {
                displayMessage(aiSpeaker, data.response);
            } else if (data.error) {
                // Display error from backend if available
                displayMessage(aiSpeaker, `Oopsie! ${data.error}`);
            } else {
                displayMessage(aiSpeaker, "Hmm, unexpected response...");
            }

        } catch (error) {
            console.error("ERROR in sendChatMessage fetch/processing:", error);
            hideThinkingBubble(); // Hide bubble on error too
            hideTypingIndicator();
            displayMessage('Bingus ✨', `Connection fuzzy! (${error.message})`);
        }
    }
    // --- Bingus Image Generation ---
    async function generateBingusImage() {
        showTypingIndicator();
        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ userName: userName }),
            });
            const responseText = await response.text();
            if (!response.ok) {
                let eData = { error: `Server error:${response.status}`, message: responseText };
                try { eData = JSON.parse(responseText); } catch (e) { }
                throw new Error(eData.error || eData.message || `Server error:${response.status}`);
            }
            const data = JSON.parse(responseText);
            hideTypingIndicator();
            const aiSpeaker = 'Bingus ✨';
            if (data.image_url) {
                // Show Bingus's message and the image
                if (data.response) displayMessage(aiSpeaker, data.response);
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('animate-fade-in-up', 'transition-all', 'duration-500', 'text-left');
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('generated-image-container', 'mt-2');
                const img = document.createElement('img');
                img.src = data.image_url;
                img.alt = 'Generated Bingus Image';
                img.className = 'max-w-xs rounded-lg shadow-md';
                const downloadLink = document.createElement('a');
                downloadLink.href = data.image_url;
                downloadLink.download = 'bingus_creation.png';
                downloadLink.className = 'download-image-link text-bubblegum-pink underline ml-2';
                downloadLink.textContent = 'Download Image';
                imageContainer.appendChild(img);
                imageContainer.appendChild(document.createElement('br'));
                imageContainer.appendChild(downloadLink);
                messageWrapper.appendChild(imageContainer);
                chatMessages.appendChild(messageWrapper);
                chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
            } else if (data.error) {
                displayMessage(aiSpeaker, `Oopsie! ${data.error}`);
            } else {
                displayMessage(aiSpeaker, "Hmm, Bingus couldn't paint this time...");
            }
        } catch (error) {
            hideTypingIndicator();
            displayMessage('Bingus ✨', `Image magic failed! (${error.message})`);
        }
    }

    // --- Progress Functions ---
    function clearFakeProgress() { if (fakeProgressInterval) { clearInterval(fakeProgressInterval); fakeProgressInterval = null; console.log("DEBUG: Cleared fake progress interval."); } }
    function showProgress() {
        console.log("DEBUG: showProgress called"); clearFakeProgress();
        if (!progressBarFill) { console.error("ERROR: Progress bar fill element not found!"); } else { progressBarFill.style.transitionDuration = '0ms'; progressBarFill.style.width = '0%'; void progressBarFill.offsetWidth; progressBarFill.style.transitionDuration = '150ms'; console.log("DEBUG: Progress bar reset to 0%"); }
        if(progressIndicator) progressIndicator.classList.remove('hidden'); if(resultArea) resultArea.classList.add('hidden'); if(errorArea) errorArea.classList.add('hidden');
        if(submitButton) { submitButton.disabled = true; submitButton.classList.add('opacity-50', 'cursor-not-allowed'); submitButton.textContent = "Processing..."; }
        let startTime = Date.now(); console.log("DEBUG: Starting fake progress interval...");
        fakeProgressInterval = setInterval(() => {
            let elapsedTime = Date.now() - startTime; let progressPercent = (elapsedTime / ESTIMATED_PROCESSING_TIME_MS) * 100; let displayPercent = Math.min(progressPercent, 95);
            console.log(`DEBUG Interval: Elapsed=${elapsedTime}ms, Progress=${progressPercent.toFixed(1)}%, Display=${displayPercent.toFixed(1)}%`);
            if (progressBarFill) { progressBarFill.style.width = displayPercent + '%'; } else { console.error("ERROR Interval: Progress bar fill missing!"); clearFakeProgress(); return; }
            if (elapsedTime >= ESTIMATED_PROCESSING_TIME_MS) { console.log("DEBUG: Fake progress time elapsed."); clearFakeProgress(); }
        }, 150);
    }
    function hideProgress() { console.log("DEBUG: hideProgress called"); clearFakeProgress(); if(progressIndicator) progressIndicator.classList.add('hidden'); if (submitButton) { submitButton.disabled = false; submitButton.classList.remove('opacity-50', 'cursor-not-allowed'); submitButton.innerHTML = "✨ Let's Process! ✨"; } }
    function showError(message, aiMessage = null) { console.log("DEBUG: showError called"); clearFakeProgress(); hideTypingIndicator(); hideProgress(); if(errorMessage) errorMessage.textContent = message; if(errorArea) errorArea.classList.remove('hidden'); if(resultArea) resultArea.classList.add('hidden'); const aiSpeaker = 'Bingus ✨'; if (aiMessage) displayMessage(aiSpeaker, aiMessage); else displayMessage(aiSpeaker, "Oh no, drama!"); if(errorArea) errorArea.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    function showResult(fileBlob, filename) {
        console.log("DEBUG: showResult called"); clearFakeProgress(); hideTypingIndicator();
        if (progressBarFill) { progressBarFill.style.transitionDuration = '300ms'; progressBarFill.style.width = '100%'; console.log("DEBUG: Set progress bar to 100%"); }
        setTimeout(() => { if(progressIndicator) progressIndicator.classList.add('hidden'); }, 500);
        if(resultArea) resultArea.classList.remove('hidden'); if(errorArea) errorArea.classList.add('hidden');
        const url = URL.createObjectURL(fileBlob); if(downloadLink) { downloadLink.href = url; downloadLink.download = filename || 'processed.xlsx'; }
        fetchProcessingSummary(); const aiSpeaker = 'Bingus ✨'; displayMessage(aiSpeaker, "YAS QUEEN! 👑 File processed! Download below & check report!");
        if(resultArea) resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (submitButton) { submitButton.disabled = false; submitButton.classList.remove('opacity-50', 'cursor-not-allowed'); submitButton.innerHTML = "✨ Let's Process! ✨"; }
    }

    // --- AI Chat Functions ---
    async function sendChatMessage() {
        console.log("DEBUG: sendChatMessage function CALLED!"); const message = chatInput?.value?.trim(); console.log(`DEBUG: Message to send: "${message}"`); if (!message) { console.log("DEBUG: Message empty."); return; } if (!chatInput) { console.error("ERROR: chatInput null!"); return; }
        displayMessage('You', message); chatInput.value = ''; chatInput.focus(); showTypingIndicator(); console.log(`DEBUG: Attempting to fetch /chat`);
        // Detect image generation intent
        const imageTriggers = [
            'draw bingus', 'generate image', 'show me bingus', 'make a picture', 'create an image', 'fat sphynx cat', 'cat pic', 'cat image', 'bingus art', 'picture of bingus'
        ];
        const lowerMsg = message.toLowerCase();
        if (imageTriggers.some(trigger => lowerMsg.includes(trigger))) {
            await generateBingusImage();
            return;
        }
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ message: message, userName: userName }),
            });
            console.log(`DEBUG: /chat response Status: ${response.status}, OK: ${response.ok}`); const responseText = await response.text(); console.log(`DEBUG: /chat response text: ${responseText}`);
            if (!response.ok) { let eData={error:`Server error:${response.status}`,message:responseText}; try{eData=JSON.parse(responseText);}catch(e){} throw new Error(eData.error||eData.message||`Server error:${response.status}`); }
            const data = JSON.parse(responseText); console.log("DEBUG: Parsed /chat data:", data); hideTypingIndicator(); const aiSpeaker = 'Bingus ✨';
            if (data.response) { displayMessage(aiSpeaker, data.response); } else if (data.error) { displayMessage(aiSpeaker, `Oopsie! ${data.error}`); } else { displayMessage(aiSpeaker, "Hmm, unexpected response..."); }
        } catch (error) { console.error("ERROR in sendChatMessage fetch/processing:", error); hideTypingIndicator(); displayMessage('Bingus ✨', `Connection fuzzy! (${error.message})`); }
    }

    // --- Random Pop-up Logic ---
    async function fetchRandomMessages() {
        console.log("DEBUG: Fetching random messages..."); // Log fetch start
        try {
            const response = await fetch('/get-random-messages');
            console.log(`DEBUG: /get-random-messages status: ${response.status}`); // Log status
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("DEBUG: Received random messages data:", data); // Log received data
            if (data.messages && data.messages.length > 0) {
                potentialPopupMessages = data.messages;
                console.log("DEBUG: Updated potentialPopupMessages:", potentialPopupMessages); // Log updated list
            } else {
                 console.log("WARN: Fetched empty/invalid random messages, using defaults.");
                 potentialPopupMessages = ["Default: Stay hydrated!", "Default: You got this!"]; // Ensure usable defaults
            }
        } catch (error) {
            console.error("ERROR: Could not fetch random messages, using defaults:", error);
            potentialPopupMessages = ["Default: Error fetching!", "Default: Try again later?"]; // Use error defaults
        }
    }

    function showRandomPopup(messageContent = null) {
        console.log(`DEBUG: showRandomPopup CALLED. Count: ${randomPopupCount}, Max Allowed: ${MAX_RANDOM_POPUPS}`); // Log entry
        if (randomPopupCount >= MAX_RANDOM_POPUPS) { console.log("INFO: Max random popups reached."); return; }
        if (!popupOverlay || !popupModal || !popupMessage) { console.error("ERROR: Random popup elements missing in showRandomPopup!"); return; } // Verify elements

        const messageIndex = randomPopupCount % potentialPopupMessages.length;
        const messageToShow = messageContent || potentialPopupMessages[messageIndex] || "Bingus is thinking...";
        console.log(`DEBUG: Showing random popup ${randomPopupCount + 1}. Index: ${messageIndex}, Message: "${messageToShow}"`); // Log selected message

        popupMessage.textContent = messageToShow; popupOverlay.classList.remove('hidden'); void popupOverlay.offsetWidth;
        popupOverlay.classList.remove('opacity-0'); popupOverlay.classList.add('opacity-100', 'animate-fade-in');
        popupModal.classList.remove('opacity-0', 'scale-95'); popupModal.classList.add('opacity-100', 'scale-100', 'animate-scale-in');
        randomPopupCount++;
    }

    function hideRandomPopup() { if (!popupOverlay || !popupModal) return; popupOverlay.classList.add('animate-fade-out'); popupModal.classList.add('animate-scale-out'); setTimeout(() => { popupOverlay.classList.add('hidden'); popupOverlay.classList.remove('opacity-100', 'animate-fade-in', 'animate-fade-out'); popupOverlay.classList.add('opacity-0'); popupModal.classList.remove('opacity-100', 'scale-100', 'animate-scale-in', 'animate-scale-out'); popupModal.classList.add('opacity-0', 'scale-95'); }, 300); console.log("DEBUG: Random popup hidden."); }

    // --- Summary Pop-up Logic ---
    async function fetchProcessingSummary() {
        console.log("DEBUG: fetchProcessingSummary CALLED."); // Log entry
        try {
            const response = await fetch('/get-processing-summary');
            console.log(`DEBUG: /get-processing-summary response Status: ${response.status}, OK: ${response.ok}`);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            const summaryData = await response.json();
            console.log("DEBUG: Received summary data:", summaryData); // Log data
            if (summaryData && Object.keys(summaryData).length > 0) {
                console.log("DEBUG: Valid summary data received, calling showSummaryPopup..."); // Log before call
                showSummaryPopup(summaryData);
            } else {
                console.log("WARN: No summary data received from backend (empty object). Popup not shown.");
            }
        } catch (error) { console.error("ERROR: Could not fetch processing summary:", error); displayMessage('Bingus ✨', "Couldn't fetch final report card!"); }
    }

    function showSummaryPopup(data) {
        console.log("DEBUG: showSummaryPopup CALLED with data:", data); // Log entry
        if (!summaryPopupOverlay || !summaryPopupModal || !summaryPopupContent) { console.error("ERROR: Summary popup elements missing!"); return; } // Check elements
        console.log("DEBUG: Summary popup elements found.");

        let contentHtml = `
            <p><strong class="font-semibold text-deep-purple">File:</strong> ${data.filename || 'N/A'}</p>
            <p><strong class="font-semibold text-deep-purple">Total Rows:</strong> ${data.total_rows ?? 'N/A'}</p><hr class="my-2 border-candy-pink/50">
            <p><strong class="font-semibold text-green-600">Successful:</strong> ${data.success_count ?? 'N/A'}</p>
            <p><strong class="font-semibold text-red-600">Failed:</strong> ${data.fail_count ?? 'N/A'}</p><hr class="my-2 border-candy-pink/50">
            <p><strong class="font-semibold text-blue-600">AI Assist Attempts:</strong> ${data.ai_assist_attempt ?? 'N/A'}</p>
            <p><strong class="font-semibold text-teal-600">AI Assist Successes:</strong> ${data.ai_assist_success ?? 'N/A'}</p>`;
        let bingusComment = "Check the file for details, darling!";
        if ((data.fail_count ?? 0) === 0 && (data.total_rows ?? 0) > 0) { bingusComment = "Purrrfect results! Slayed! ✨👑"; }
        else if ((data.success_count ?? 0) / (data.total_rows ?? 1) < 0.5) { bingusComment = "Oof, many misses! Bingus tried!"; }
        contentHtml += `<p class="mt-3 pt-3 border-t border-candy-pink/50 italic text-deep-purple/90">"${bingusComment}" - Bingus 🐾</p>`;
        summaryPopupContent.innerHTML = contentHtml;

        summaryPopupOverlay.classList.remove('hidden'); void summaryPopupOverlay.offsetWidth;
        summaryPopupOverlay.classList.remove('opacity-0'); summaryPopupOverlay.classList.add('opacity-100', 'animate-fade-in');
        summaryPopupModal.classList.remove('opacity-0', 'scale-95'); summaryPopupModal.classList.add('opacity-100', 'scale-100', 'animate-scale-in');
        console.log("DEBUG: Summary popup should be visible now."); // Log visibility
    }

    function hideSummaryPopup() { if (!summaryPopupOverlay || !summaryPopupModal) return; summaryPopupOverlay.classList.add('animate-fade-out'); summaryPopupModal.classList.add('animate-scale-out'); setTimeout(() => { summaryPopupOverlay.classList.add('hidden'); summaryPopupOverlay.classList.remove('opacity-100', 'animate-fade-in', 'animate-fade-out'); summaryPopupOverlay.classList.add('opacity-0'); summaryPopupModal.classList.remove('opacity-100', 'scale-100', 'animate-scale-in', 'animate-scale-out'); summaryPopupModal.classList.add('opacity-0', 'scale-95'); }, 300); console.log("DEBUG: Summary popup hidden."); }

    // --- File Upload Handling ---
    if(fileInput) { fileInput.addEventListener('change', (e) => { if(fileNameDisplay) {fileNameDisplay.textContent=fileInput.files.length>0?fileInput.files[0].name:'No file chosen... yet!';} if(errorArea)errorArea.classList.add('hidden'); if(resultArea)resultArea.classList.add('hidden'); }); }
    if(uploadForm) { uploadForm.addEventListener('submit', async (event) => { event.preventDefault(); if (!fileInput?.files?.length) { showError("Select a file first!"); return; } const file = fileInput.files[0]; if (!/\.(xlsx|xls)$/i.test(file.name)) { showError("Invalid file type!"); return; } showProgress(); const formData = new FormData(); formData.append('file', file); try { displayMessage('Bingus ✨', "Processing started..."); const response = await fetch('/process-excel', { method: 'POST', body: formData }); if (!response.ok) { let eData={error:`Server error:${response.status}`,ai_message:null}; try{eData=await response.json();}catch(e){} const err=new Error(eData.error); err.cause=eData.ai_message; throw err; } const contentType=response.headers.get('content-type'); if (contentType?.includes('spreadsheetml.sheet')) { const blob=await response.blob(); const disp=response.headers.get('content-disposition'); let fname='processed.xlsx'; if(disp){const m=/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/.exec(disp);if(m?.[1])fname=decodeURIComponent(m[1]);} showResult(blob,fname); } else { throw new Error("Unexpected server response."); } } catch (error) { console.error("Upload error:", error); showError(error.message||"Upload error.", error.cause); } finally { console.log("DEBUG: Upload fetch settled."); } }); }

    // --- Event Listeners ---
    console.log("DEBUG: Adding event listeners...");
    if(sendChatButton) { sendChatButton.addEventListener('click', () => { console.log("DEBUG: Send button CLICKED!"); sendChatMessage(); }); console.log("DEBUG: Click listener added to send button."); } else { console.error("ERROR: Send button not found for listener."); }
    if(chatInput) { chatInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { console.log("DEBUG: Enter key pressed!"); event.preventDefault(); sendChatMessage(); } }); console.log("DEBUG: Keydown listener added to chat input."); } else { console.error("ERROR: Chat input not found for listener."); }
    if(closePopupButton) closePopupButton.addEventListener('click', hideRandomPopup); if(closePopupButtonX) closePopupButtonX.addEventListener('click', hideRandomPopup); if(popupOverlay) popupOverlay.addEventListener('click', hideRandomPopup);
    if(closeSummaryPopupButton) closeSummaryPopupButton.addEventListener('click', hideSummaryPopup); if(closeSummaryPopupButtonX) closeSummaryPopupButtonX.addEventListener('click', hideSummaryPopup); if(summaryPopupOverlay) summaryPopupOverlay.addEventListener('click', hideSummaryPopup);
    console.log("DEBUG: Event listeners setup complete.");

    // --- Initial Load ---
    try {
        console.log("DEBUG: Running initial setup...");
        // Removed clearChatLoading as it might not be needed or defined early enough
        // Fetch messages THEN set timeouts
        fetchRandomMessages().then(() => {
            console.log("DEBUG: Random messages fetch completed. Setting timeouts.");
            setTimeout(() => { console.log("DEBUG: Timeout 1 fired. Calling showRandomPopup."); showRandomPopup(); }, 5000);
            setTimeout(() => { console.log("DEBUG: Timeout 2 fired. Calling showRandomPopup."); showRandomPopup(); }, 45000);
        });
        // Add initial greeting - Ensure displayMessage is called correctly
        setTimeout(() => {
            console.log("DEBUG: Calling displayMessage for initial greeting.");
            // Make sure 'Bingus ✨' triggers the AI path in displayMessage
            displayMessage('Bingus ✨', "Heeey gorgeous! Welcome! Upload a file or ask me anything! 💖");
        }, 1000); // Delay slightly to ensure everything is ready
        console.log("DEBUG: Initial setup scheduled.");
    } catch (error) {
        console.error("ERROR during initial setup:", error);
        // Display an error in the chat if initial setup fails
        if (chatMessages) {
             chatMessages.innerHTML = `<p class="text-red-500 p-4">Error initializing chat: ${error.message}</p>`;
        }
    }

}); // End DOMContentLoaded

// --- Fancy Bingus Thinking Animation ---
function showFancyThinking() {
    if (!typingIndicator) return;
    typingIndicator.innerHTML = `
        <div class="flex items-center gap-2">
            <img src="/static/images/kitten_icon.png" alt="Bingus thinking" class="w-8 h-8 rounded-full animate-bounce-in" style="box-shadow:0 0 12px #ff77cc99;">
            <span class="text-bubblegum-pink font-bold animate-pulse">Bingus is thinking...</span>
            <span class="fancy-dots text-bubblegum-pink text-xl">💭</span>
        </div>
    `;
    typingIndicator.classList.remove('hidden');
    isTyping = true;
    // Animate dots
    let dotCount = 0;
    if (typingIndicator.fancyInterval) clearInterval(typingIndicator.fancyInterval);
    typingIndicator.fancyInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        const dots = '💭'.repeat(dotCount + 1);
        const dotSpan = typingIndicator.querySelector('.fancy-dots');
        if (dotSpan) dotSpan.textContent = dots;
    }, 400);
}
function hideFancyThinking() {
    if (!typingIndicator) return;
    typingIndicator.classList.add('hidden');
    isTyping = false;
    if (typingIndicator.fancyInterval) clearInterval(typingIndicator.fancyInterval);
    typingIndicator.innerHTML = `
        <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-candy-pink rounded-full animate-dot-bounce-1"></div>
        <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-candy-pink rounded-full animate-dot-bounce-2"></div>
        <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-candy-pink rounded-full animate-dot-bounce-3"></div>
    `;
}
// Patch showTypingIndicator/hideTypingIndicator to use fancy version
function showTypingIndicator() { showFancyThinking(); }
function hideTypingIndicator() { hideFancyThinking(); }