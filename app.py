# --- Imports ---
import os
import pandas as pd
import time
import random
import io
from flask import Flask, render_template, request, jsonify, send_file, flash, session
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from dotenv import load_dotenv
from openai import OpenAI, APIError, AuthenticationError
from datetime import datetime, timedelta
import pytz
import traceback
import re
from whitenoise import WhiteNoise # Keep for Render

# --- Load Environment Variables ---
load_dotenv()

# --- Flask App Initialization ---
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_unsafe_dev_key_CHANGE_ME")
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/', prefix='/static/') # Keep for Render

# --- Geocoding Setup ---
geolocator = Nominatim(user_agent="BubblegumGeocoder/1.0 (YourAppContact@example.com)")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1, error_wait_seconds=10)

# --- Kluster AI / OpenAI Client Setup ---
KLUSTER_API_KEY = os.getenv("KLUSTER_API_KEY")
KLUSTER_BASE_URL = os.getenv("KLUSTER_BASE_URL")
ai_client = None
# ... (Keep AI client initialization logic) ...
if KLUSTER_API_KEY and KLUSTER_BASE_URL:
    try: ai_client = OpenAI(api_key=KLUSTER_API_KEY, base_url=KLUSTER_BASE_URL); print("✨ OpenAI client initialized...")
    except Exception as e: print(f"🚨 ERROR initializing AI client: {e}")
else: print("⚠️ WARN: AI Env Vars missing.")


# --- Helper Functions ---
def find_columns(df): # ... (Keep existing implementation) ...
    pass
def get_coords(address, postcode, row_num): # ... (Keep existing implementation) ...
    pass

# --- AI Interaction Function (Using Bingus with Llama 4) ---
# ✨ Changed default model_name and updated default temperature in API call ✨
def talk_to_bingus(prompt, conversation_history=[], model_name="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", max_resp_tokens=180, temperature=0.6): # Default temp 0.6
    """Sends prompt to Kluster AI (Llama 4 Maverick by default) and gets yassified response."""
    print(f"DEBUG: talk_to_bingus called (Model: {model_name}, Temp: {temperature}) for prompt: '{prompt[:60]}...'")
    if not ai_client: print("WARN: talk_to_bingus - AI client N/A."); return random.choice(["AI offline...", "Bingus napping..."])

    try: # Setup System Prompt
        try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p %Z')
        except Exception: current_time_madrid="daytime"
        system_prompt = ( # Keep Bingus persona prompt
            "You are Bingus, a ridiculously fun, super enthusiastic..."
            # "...CRITICAL: Provide only the final chat response..." # Keep this just in case
            f"... Current time is {current_time_madrid}..."
        )
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]

        try:
            print(f"DEBUG: Calling Kluster AI completions.create (Model: {model_name}, MaxTokens: {max_resp_tokens}, Temp: {temperature})")
            completion = ai_client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=max_resp_tokens, # Keep controlled limits
                temperature=temperature, # Use specified temperature (default 0.6)
                top_p=1
            )
            print(f"DEBUG: Raw completion object received.")

            if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
                ai_response_raw = completion.choices[0].message.content
                print(f"DEBUG: Raw AI response: '{ai_response_raw[:150]}...'")

                # Keep cleanup attempt, maybe Llama does similar things sometimes?
                ai_response_cleaned = ai_response_raw
                if "</think>" in ai_response_raw:
                    parts = ai_response_raw.split("</think>", 1)
                    if len(parts) > 1 and parts[1].strip(): ai_response_cleaned = parts[1].strip(); print(f"DEBUG: Used text after </think> tag.")
                    else: ai_response_cleaned = re.sub(r"<think>.*?</think>", "", ai_response_raw, flags=re.DOTALL).strip(); print(f"DEBUG: Fallback regex cleanup attempted.")
                elif ai_response_raw.strip().startswith("<think>"): ai_response_cleaned = "Bingus got lost in thought..."; print(f"WARN: Response starts with <think> but no closing?")

                if len(ai_response_cleaned) > 1: print(f"SUCCESS: Final cleaned response: '{ai_response_cleaned[:60]}...'"); return ai_response_cleaned
                else: print(f"WARN: AI response empty after cleanup (Raw: '{ai_response_raw}')"); return "Bingus is speechless... ✨"
            else: print(f"WARN: AI response structure unexpected."); return "OMG, my brain went blank 🧠..."
        # ... (Keep existing Error handling) ...
        except Exception as e: print(f"🚨 ERROR: Unexpected in talk_to_bingus API call: {e}"); traceback.print_exc(); return f"Yikes, tech issues! Err: {e}"
    except Exception as e: print(f"🚨 ERROR: Unexpected setup in talk_to_bingus: {e}"); traceback.print_exc(); return f"Yikes, setup error! Err: {e}"


# --- Flask Routes ---

@app.route('/')
def index(): session.pop('processing_summary', None); return render_template('index.html')

@app.route('/process-excel', methods=['POST'])
def process_excel():
    # ... (File checks) ...
    if 'file' not in request.files or request.files['file'].filename == '': return jsonify({/*...*/}), 400
    file = request.files['file']; if not (file.filename.endswith(('.xlsx', '.xls'))): return jsonify({/*...*/}), 400
    try:
        print(f"INFO: Processing file: {file.filename}..."); df = pd.read_excel(file);
        if df.empty: raise ValueError("Uploaded file is empty")
        address_col, postcode_col = find_columns(df)
        results, geocoding_statuses = [], []; success_count, fail_count, ai_assist_success, ai_assist_attempt, total_rows = 0, 0, 0, 0, len(df)
        print(f"INFO: Starting geocoding for {total_rows} rows..."); print("="*20 + " Geocoding Log " + "="*20)
        for index, row in df.iterrows():
            row_num = index + 2; address_value = row.get(address_col); postcode_value = row.get(postcode_col); status = "Failed"
            lat, lon = get_coords(address_value, postcode_value, row_num)
            # AI Assist Logic
            if lat is None or lon is None:
                ai_assist_attempt += 1
                if ai_client:
                    ai_prompt=f"Fix geocode fail: Addr='{address_value}', Postcode='{postcode_value}'. Reply ONLY with corrected address string or 'FAIL'."
                    # ✨ AI Assist now uses Llama 4 by default, with fewer tokens ✨
                    print(f"DEBUG (R{row_num}): Calling AI Assist using default model (Llama 4)...")
                    ai_sugg_raw = talk_to_bingus(ai_prompt, max_resp_tokens=60) # Use default model (Llama 4), lower temp (0.6), fewer tokens
                    print(f"DEBUG (R{row_num}): AI assist raw sugg: '{ai_sugg_raw}'")
                    ai_sugg = None
                    # Filtering logic remains the same
                    if ai_sugg_raw and isinstance(ai_sugg_raw,str) and "FAIL" not in ai_sugg_raw.upper() and len(ai_sugg_raw.strip())>5 and not any(e in ai_sugg_raw.lower() for e in ["sorry","unable","<think>"]):
                        ai_sugg=ai_sugg_raw.strip().strip('"\''); print(f"DEBUG(R{row_num}): Using AI sugg: '{ai_sugg}'"); print(f"INFO (R{row_num}): Re-trying geocode w/ AI suggestion...")
                        lat_ai, lon_ai = get_coords(ai_sugg, "", row_num)
                        if lat_ai is not None and lon_ai is not None: lat,lon=lat_ai,lon_ai; status="Success(AI Assist)"; ai_assist_success+=1; print(f"SUCCESS(R{row_num}): AI Assist OK!")
                        else: status="Failed(AI Tried)"; print(f"INFO(R{row_num}): AI Assist Failed.")
                    else: status="Failed(AI Skip/FAIL)"; print(f"INFO(R{row_num}): AI unusable sugg.")
                else: status="Failed(AI N/A)"; print(f"WARN(R{row_num}): AI N/A.")
            if lat is not None and lon is not None and status=="Failed": status="Success(Primary)"
            results.append({'latitude':lat,'longitude':lon}); geocoding_statuses.append(status); print(f"DEBUG(R{row_num}): Appended: Status:'{status}'")
            if status.startswith("Success"): success_count+=1; else: fail_count+=1
        print("="*20 + " Geocoding End " + "="*24); print(f"INFO: Geocoding done...") # Print summary counts
        df['geocoded_latitude']=[r['latitude'] for r in results]; df['geocoded_longitude']=[r['longitude'] for r in results]; df['geocoding_status']=geocoding_statuses
        print("DEBUG: DataFrame head:"); print(df[[c for c in ['geocoded_latitude','geocoded_longitude','geocoding_status'] if c in df.columns]].head())
        summary = { # Store summary
             "total_rows":total_rows, "success_count":success_count, "fail_count":fail_count,
             "ai_assist_attempt":ai_assist_attempt, "ai_assist_success":ai_assist_success, "filename":file.filename
        }; session['processing_summary'] = summary; print(f"DEBUG: Stored summary.")
        output=io.BytesIO(); # Save & Send File
        with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name="Processed_Data"[:31].replace('/','-'), na_rep='')
        output.seek(0); print("INFO: Processed file ready.");
        return send_file(output, download_name=f"processed_{os.path.splitext(file.filename)[0]}.xlsx", as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    # ... (keep existing error handling) ...
    except Exception as e: print(f"🚨 ERROR: Unexpected in process_excel: {e}"); traceback.print_exc(); return jsonify({/*...*/}), 500

@app.route('/get-processing-summary', methods=['GET'])
def get_processing_summary():
    # ... (Keep existing implementation) ...
    pass # Placeholder

@app.route('/chat', methods=['POST'])
def chat():
    """Handles user messages to the AI."""
    # This now uses Llama 4 Maverick by default
    print("DEBUG: /chat route handler CALLED")
    if not ai_client: print("WARN: /chat - AI client N/A."); return jsonify({"response": "Bingus is napping..."}), 503
    user_message = request.json.get('message')
    if not user_message: print("WARN: /chat - No msg."); return jsonify({"error": "No message provided"}), 400
    # ✨ Update debug log ✨
    print(f"DEBUG: /chat - Calling talk_to_bingus (Llama 4) for message: '{user_message[:50]}...'")
    ai_response = talk_to_bingus(f"The user says: '{user_message}'. Respond in your yassified persona.") # Uses new default model/temp
    print(f"DEBUG: /chat - Received response from talk_to_bingus: '{ai_response[:50]}...'")
    if "error" in ai_response.lower() or "failed" in ai_response.lower(): return jsonify({"response": ai_response}), 500
    return jsonify({"response": ai_response})

@app.route('/get-random-messages', methods=['GET'])
def get_random_messages():
    """Provides a list of potential random messages for pop-ups."""
    # This also uses talk_to_bingus, now defaulting to Llama 4 Maverick
    default_messages=["Sparkle On! ✨", "You're doing great!💖", "Slay! 🔥"]
    if not ai_client: print("DEBUG: RndMsg - AI N/A"); return jsonify({"messages":default_messages})
    try:
        # ... (keep existing logic for generating prompts) ...
        try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p')
        except Exception: current_time_madrid="now"
        base_prompts=["Quick compliment!","Tiny sassy fact?","Encouraging words!","Chic fashion tip?","Sparkle reminder!","Madrid time comment!"]
        random.shuffle(base_prompts); selected_prompts=base_prompts[:3]; generated_messages=[]
        # ✨ Update debug log ✨
        print(f"DEBUG: RndMsg - Requesting {len(selected_prompts)} msgs from AI (Llama 4)...")
        for i, prompt in enumerate(selected_prompts):
            try:
                # Uses new default model (Llama 4), fewer tokens, default temp (0.6)
                response = talk_to_bingus(prompt, max_resp_tokens=80)
                print(f"DEBUG: RndMsg AI resp {i+1}: '{response[:60]}...'")
                # Standard filtering
                if response and isinstance(response,str) and len(response.strip())>3 and not any(e in response.lower() for e in ["error","sorry","offline","unable","can't","napping","blank","fallback","brain","circuits","connection","cannot","not programmed", "<think>"]):
                    generated_messages.append(response)
                else: print(f"WARN: RndMsg - Filtering AI resp: '{response}'")
            except Exception as e: print(f"ERROR: RndMsg - Exception gen msg {i+1}: {e}")
        final_messages = generated_messages if generated_messages else default_messages;
        print(f"DEBUG: RndMsg - Returning: {final_messages[:3]}");
        return jsonify({"messages":final_messages[:3]})
    except Exception as e: print(f"🚨 FATAL ERROR in get_random_messages: {e}"); traceback.print_exc(); return jsonify({"messages":default_messages})

# --- Run the App ---
if __name__ == '__main__':
    # ... (Keep existing startup print statements) ...
    print("="*50); print("✨ Starting Bingus Geocoder Flask App ✨"); print("="*50)
    # ... (Check AI client, Secret Key) ...
    print("Starting Flask development server (Debug Mode)..."); print("="*50)
    app.run(debug=True, host='0.0.0.0', port=5000) # Gunicorn runs wsgi:application on Render