from flask import Flask, request, jsonify, send_from_directory
import requests
import os

app = Flask(__name__, static_url_path='', static_folder='.')

API_KEY = "AIzaSyA5J1LV--ar5FganbjbbKmGv6amFY1Jmlo"

@app.route('/')
def index():
    return send_from_directory('.', 'jarvis2.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt', '')
    
    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    system_instruction = "You are Jarvis, a highly advanced, helpful, concise AI assistant. You speak with a female voice. Your responses should be helpful, sophisticated yet accessible. Do not use overly long descriptions unless asked."
    
    build_prompt = f"{system_instruction}\n\nUser: {prompt}"
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{"text": build_prompt}]
        }]
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        # --- ADD THESE TWO LINES ---
        print("GEMINI ERROR DETAILS:")
        print(response.text)
        # ---------------------------                                                                                                                                                         response.raise_for_status()
        response_data = response.json()
        
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            text = response_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'response': text})
        else:
            return jsonify({'error': "I'm sorry, I couldn't generate a response."}), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"API Error: ({str(e)})"}), 500
    except Exception as e:
        return jsonify({'error': f"System Error: ({str(e)})"}), 500

if __name__ == '__main__':
    # Running on port 8080
    app.run(host='0.0.0.0', port=8080, debug=True)
