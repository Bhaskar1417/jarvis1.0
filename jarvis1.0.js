document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---    const apiKeyModal = document.getElementById('api-key-modal');
    const mainInterface = document.getElementById('main-interface');
    const settingsBtn = document.getElementById('settings-btn');
    
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const micBtn = document.getElementById('mic-btn');
    const chatContainer = document.getElementById('chat-container');
    const voiceOrb = document.getElementById('voice-orb');
    const statusText = document.getElementById('status-text');

    // --- State & Config ---
    // --- State & Config ---
    let isListening = false;
    let isSpeaking = false;
    let recognition = null;
    let selectedStorageVoice = null;
    
    const SYSTEM_NAME = "Jarvis";
    
    // Markdown to HTML simple parser (basic functionality)
    function parseMarkdown(text) {
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return `<p>${html}</p>`;
    }

    // --- Initialization ---
    initSystem();

    settingsBtn.addEventListener('click', () => {
        // Settings could be re-implemented here
        alert("Settings feature can be integrated here.");
    });

    function initSystem() {
        mainInterface.style.display = 'flex';
        setupSpeechSynthesis();
        setupSpeechRecognition();
        addSystemMessage("Systems online. Secure connection to Gemini API established.");
        setTimeout(() => speak("Greetings. I am Jarvis, your assistant. How may I be of service?"), 500);
    }

    // --- UI Helpers ---
    function setStatus(text, type = 'normal') {
        statusText.textContent = text;
        if (type === 'listening') {
            voiceOrb.classList.add('listening');
            voiceOrb.classList.remove('speaking');
        } else if (type === 'speaking') {
            voiceOrb.classList.add('speaking');
            voiceOrb.classList.remove('listening');
        } else {
            voiceOrb.classList.remove('listening', 'speaking');
        }
    }

    function addMessage(content, sender = 'user') {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', `${sender}-msg`);
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('msg-content');
        contentDiv.innerHTML = sender === 'bot' ? parseMarkdown(content) : escapeHTML(content);
        
        msgDiv.appendChild(contentDiv);
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function addSystemMessage(content) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', 'system-msg');
        msgDiv.innerHTML = `<div class="msg-content">${escapeHTML(content)}</div>`;
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // --- Speech Synthesis (Text to Speech) ---
    function setupSpeechSynthesis() {
        // Find a suitable female voice
        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Try to find female/natural voices - specifically targeting Google UK Female or similar
                const femaleVoices = voices.filter(v => 
                    v.name.includes('Female') || 
                    v.name.includes('Samantha') || 
                    v.name.includes('Victoria') ||
                    v.name.includes('Google UK English Female') ||
                    v.name.includes('Zira') // Windows fallback
                );
                
                if (femaleVoices.length > 0) {
                    selectedStorageVoice = femaleVoices[0];
                } else {
                    // Fallback to first English voice
                    selectedStorageVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                }
            }
        };

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = setVoice;
        }
        setVoice(); // Try immediately
    }

    function speak(text) {
        if (!window.speechSynthesis) return;
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Strip markdown and code blocks for speech
        const plainText = text
            .replace(/```[\s\S]*?```/g, " I have provided code in the chat. ")
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '');

        const utterance = new SpeechSynthesisUtterance(plainText);
        if (selectedStorageVoice) {
            utterance.voice = selectedStorageVoice;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher pitch for female voice presentation

        utterance.onstart = () => {
            isSpeaking = true;
            setStatus('Speaking...', 'speaking');
        };

        utterance.onend = () => {
            isSpeaking = false;
            setStatus('Standby');
        };

        utterance.onerror = () => {
            isSpeaking = false;
            setStatus('Standby');
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Speech Recognition (Voice to Text) ---
    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            micBtn.style.display = 'none';
            console.warn("Speech recognition not supported in this browser.");
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('active');
            setStatus('Listening...', 'listening');
            searchInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            processInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isListening = false;
            micBtn.classList.remove('active');
            setStatus('Standby');
            searchInput.placeholder = "Ask Jarvis anything...";
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('active');
            if (!isSpeaking) setStatus('Standby');
            searchInput.placeholder = "Ask Jarvis anything...";
        };
    }

    micBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            // Stop speaking if mic is clicked to interrupt
            if(isSpeaking) window.speechSynthesis.cancel();
            
            try {
                recognition.start();
            } catch (e) {
                console.error("Failed to start recognition", e);
            }
        }
    });

    // --- Gemini API Interaction ---
    // --- Python Backend API Interaction ---
    async function callGeminiAPI(prompt) {
        setStatus('Processing...', 'normal');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.response) {
                return data.response;
            } else if (data.error) {
                return "Error: " + data.error;
            } else {
                return "I'm sorry, I couldn't generate a response.";
            }

        } catch (error) {
            console.error("Backend API Error:", error);
            return `System Error: Unable to connect to backend processes. (${error.message})`;
        }
    }

    // --- Main Processing ---
    async function processInput(text) {
        if (!text.trim()) return;
        
        searchInput.value = '';
        
        // Display user message
        addMessage(text, 'user');
        
        // Show typing indicator in orb (optional)
        setStatus('Processing...', 'normal');
        
        // Fetch AI Response
        const responseText = await callGeminiAPI(text);
        
        // Display bot message
        addMessage(responseText, 'bot');
        
        // Speak response
        speak(responseText);
    }

    // Form submission (Text Search)
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Stop speaking if user types a new command
        if(isSpeaking) window.speechSynthesis.cancel();
        
        const text = searchInput.value;
        processInput(text);
    });
});
