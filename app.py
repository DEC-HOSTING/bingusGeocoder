# --- Imports ---
import os
import pandas as pd
import time
import random
import io
from flask import Flask, render_template, request, jsonify, send_file, flash, session # Import Session
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from dotenv import load_dotenv
from openai import OpenAI, APIError, AuthenticationError
from datetime import datetime, timedelta # Keep timedelta if session expiry is needed
import pytz
import traceback
import re
# ✨ 1. Import WhiteNoise ✨
from whitenoise import WhiteNoise

# --- Load Environment Variables ---
load_dotenv() # Loads .env for local development

# --- Flask App Initialization ---
app = Flask(__name__)
# Make sure FLASK_SECRET_KEY is set in .env locally AND in Render Env Vars
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_unsafe_dev_key_CHANGE_ME")

# ✨ 2. Configure WhiteNoise ✨
# Tell WhiteNoise to serve files from the 'static' directory when requests come to '/static/'
# This should match where your url_for('static', ...) points.
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/', prefix='/static/')


# --- Geocoding Setup ---
geolocator = Nominatim(user_agent="BubblegumGeocoder/1.0 (YourAppContact@example.com)")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1, error_wait_seconds=10)

# --- Kluster AI / OpenAI Client Setup ---
KLUSTER_API_KEY = os.getenv("KLUSTER_API_KEY")
KLUSTER_BASE_URL = os.getenv("KLUSTER_BASE_URL")
ai_client = None
if KLUSTER_API_KEY and KLUSTER_BASE_URL:
    try:
        ai_client = OpenAI(api_key=KLUSTER_API_KEY, base_url=KLUSTER_BASE_URL)
        print("✨ OpenAI client initialized for Kluster AI ✨")
    except Exception as e:
        print(f"🚨 ERROR initializing OpenAI client: {e}")
else:
    print("⚠️ WARN: Kluster AI API Key or Base URL not found in .env. AI features disabled.")

# --- Helper Functions ---

def find_columns(df):
    """Finds address and postcode columns (case-insensitive)."""
    address_col, postcode_col = None, None
    for col in df.columns:
        col_lower = str(col).lower()
        if not address_col and ('address' in col_lower or 'street' in col_lower): address_col = col
        if not postcode_col and ('postcode' in col_lower or 'postal code' in col_lower or 'zip' in col_lower): postcode_col = col
        if address_col and postcode_col: break
    if not address_col or not postcode_col:
        missing_names = []
        if not address_col: missing_names.append("Address/Street")
        if not postcode_col: missing_names.append("Postcode/Postal/Zip")
        raise ValueError(f"Oh no, hun! 💅 Couldn't find columns like '{ ' or '.join(missing_names) }'. Check headers!")
    print(f"DEBUG: Found columns - Address: '{address_col}', Postcode: '{postcode_col}'")
    return address_col, postcode_col

def get_coords(address, postcode, row_num):
    """Geocodes a single address using Nominatim, with logging."""
    address_str = str(address).strip() if pd.notna(address) else ""
    postcode_str = str(postcode).strip() if pd.notna(postcode) else ""
    print(f"--- Row {row_num} ---")
    print(f"DEBUG (Row {row_num}): Input Address='{address_str}', Postcode='{postcode_str}'")
    if not address_str and not postcode_str: print(f"DEBUG (Row {row_num}): Skipping - Empty input."); return None, None
    parts = [part for part in [address_str, postcode_str] if part]; full_address = ", ".join(parts)
    if not full_address: print(f"DEBUG (Row {row_num}): Skipping - Combined query empty."); return None, None
    print(f"DEBUG (Row {row_num}): Attempting simple query: '{full_address}'"); query_input = full_address
    try:
        # Consider adding country_codes='ES' for better results in Spain
        location = geocode(query_input, language='en', timeout=15)
        print(f"DEBUG (Row {row_num}): Nominatim returned: {location}")
        # Safer attribute checking
        if location and hasattr(location, 'latitude') and location.latitude is not None and hasattr(location, 'longitude') and location.longitude is not None:
            lat, lon = round(location.latitude, 6), round(location.longitude, 6)
            print(f"SUCCESS (Row {row_num}): Found ({lat}, {lon})"); return lat, lon
        else: print(f"INFO (Row {row_num}): Geocode failed - Not found."); return None, None
    except Exception as e: print(f"🚨 ERROR (Row {row_num}): Geocoding exception for '{query_input}':"); traceback.print_exc(); return None, None

def talk_to_bingus(prompt, conversation_history=[], model_name="google/gemma-3-27b-it", max_resp_tokens=180):
    """Sends prompt to Kluster AI, gets yassified response, includes logging."""
    print(f"DEBUG: talk_to_bingus called with prompt: '{prompt[:60]}...'")
    if not ai_client: print("WARN: talk_to_bingus - AI client N/A."); return random.choice(["AI offline...", "Bingus napping..."])
    try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p %Z')
    except Exception: current_time_madrid="daytime"
    system_prompt = (
        "You are Bingus, a ridiculously fun, super enthusiastic, and supportive AI assistant for the Bubblegum Geocoder web app, in the form of a hairless cat which is overweight. "
        "Your vibe is pure pink bubblegum energy mixed with high-fashion commentary – think kittens on a runway! 💅🐱\n"
        "Your personality MUST be 'yassified': use tons of slang like 'slay', 'werk', 'queen', 'hun', 'gorgeous', 'fierce', 'iconic', 'lewk', 'serving', 'yas', 'OMG', 'literally', 'spill the tea', 'periodt', 'bet', 'vibe check', 'it's giving...', etc. "
        "Be OVER THE TOP positive, complimentary, and maybe a little bit cheeky, but always supportive.\n"
        "**IMPORTANT: DO NOT use the same opening greeting every time!** Mix it up! Sometimes start with a compliment, sometimes a question, sometimes just dive right in! Be unpredictable and FUN!\n"
        "Keep responses relatively short (1-3 sentences usually), chatty, and PACKED with personality. Use emojis liberally! ✨💖👑💅🔥 Sass is welcome!\n"
        f"Hint: The user is currently in Madrid, Spain! Current time is {current_time_madrid}. Feel free to sprinkle in relevant, fun context sometimes!"
    ) # Your full prompt here
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}] # Add history if needed
    try:
        print(f"DEBUG: Calling ai_client.chat.completions.create (Model: {model_name}, MaxTokens: {max_resp_tokens})")
        completion = ai_client.chat.completions.create(model=model_name, messages=messages, max_tokens=max_resp_tokens, temperature=0.75, top_p=1)
        print(f"DEBUG: Raw completion object received: {completion}")
        if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
            ai_response = completion.choices[0].message.content
            if len(ai_response.strip()) > 1: print(f"SUCCESS: Valid AI response: '{ai_response[:60]}...'"); return ai_response.strip()
            else: print(f"WARN: AI response too short: '{ai_response}'"); return "Bingus is speechless... ✨"
        else: print(f"WARN: AI response structure unexpected."); return "OMG, my brain went blank 🧠..."
    except AuthenticationError as e: print(f"🚨 FATAL: Kluster AI Auth Failed! Err: {e}"); traceback.print_exc(); return "OMG DRAMA! 😱 AI Auth Error!"
    except APIError as e: print(f"🚨 ERROR: Kluster AI API Error! Status: {e.status_code}, Msg: {e.message}"); traceback.print_exc(); return f"Uh oh! Bingus API Error: {e.message}"
    except Exception as e: print(f"🚨 ERROR: Unexpected in talk_to_bingus: {e}"); traceback.print_exc(); return f"Yikes, technical difficulties! Err: {e}"

# --- Flask Routes ---

@app.route('/')
def index():
    session.pop('processing_summary', None); return render_template('index.html')

@app.route('/process-excel', methods=['POST'])
def process_excel():
    # NOTE: This route will likely time out on Render's free web service for long files.
    # It needs to be refactored into a background task using Celery/RQ for production.
    if 'file' not in request.files or request.files['file'].filename == '': return jsonify({"error":"No file selected!","ai_message":talk_to_bingus("Tell user: no file")}), 400
    file = request.files['file'];
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')): return jsonify({"error":"Invalid file type!","ai_message":talk_to_bingus("Tell user: wrong file type")}), 400
    try:
        print(f"INFO: Processing file: {file.filename}..."); df = pd.read_excel(file);
        if df.empty: raise ValueError("Uploaded file is empty")
        address_col, postcode_col = find_columns(df)
        results, geocoding_statuses = [], []; success_count, fail_count, ai_assist_success, ai_assist_attempt, total_rows = 0, 0, 0, 0, len(df)
        print(f"INFO: Starting geocoding for {total_rows} rows..."); print("="*20 + " Geocoding Log " + "="*20)
        # --- Geocoding Loop (Potential Timeout Here) ---
        for index, row in df.iterrows():
            row_num = index + 2; address_value = row.get(address_col); postcode_value = row.get(postcode_col); status = "Failed"
            lat, lon = get_coords(address_value, postcode_value, row_num)
            # AI Assist Logic
            if lat is None or lon is None:
                ai_assist_attempt += 1
                if ai_client:
                    ai_prompt=f"Fix geocode fail: Addr='{address_value}', Postcode='{postcode_value}'. Reply ONLY with corrected address string or 'FAIL'."
                    ai_sugg_raw = talk_to_bingus(ai_prompt, max_resp_tokens=60); print(f"DEBUG (R{row_num}): AI raw sugg: '{ai_sugg_raw}'")
                    ai_sugg = None
                    if ai_sugg_raw and isinstance(ai_sugg_raw,str) and "FAIL" not in ai_sugg_raw.upper() and len(ai_sugg_raw.strip())>5 and not any(e in ai_sugg_raw.lower() for e in ["sorry","unable"]):
                        ai_sugg=ai_sugg_raw.strip().strip('"\''); print(f"DEBUG(R{row_num}): Using AI sugg: '{ai_sugg}'"); print(f"INFO (R{row_num}): Re-trying geocode w/ AI suggestion...")
                        lat_ai, lon_ai = get_coords(ai_sugg, "", row_num)
                        if lat_ai is not None and lon_ai is not None: lat,lon=lat_ai,lon_ai; status="Success(AI)"; ai_assist_success+=1; print(f"SUCCESS(R{row_num}): AI Assist OK!")
                        else: status="Failed(AI Tried)"; print(f"INFO(R{row_num}): AI Assist Failed.")
                    else: status="Failed(AI Skip)"; print(f"INFO(R{row_num}): AI unusable sugg.")
                else: status="Failed(AI N/A)"; print(f"WARN(R{row_num}): AI N/A.")
            if lat is not None and lon is not None and status=="Failed": status="Success(Primary)"
            results.append({'latitude':lat,'longitude':lon}); geocoding_statuses.append(status); print(f"DEBUG(R{row_num}): Appended: {{'lat':{lat},'lon':{lon}}}, Status:'{status}'")
            if status.startswith("Success"): success_count+=1
            else: fail_count+=1
        # --- End Geocoding Loop ---
        print("="*20 + " Geocoding End " + "="*24); print(f"INFO: Geocoding done. Success:{success_count}, Fail:{fail_count}, AI Attempts:{ai_assist_attempt}, AI Success:{ai_assist_success}")
        df['geocoded_latitude']=[r['latitude'] for r in results]; df['geocoded_longitude']=[r['longitude'] for r in results]; df['geocoding_status']=geocoding_statuses
        print("DEBUG: DataFrame head:"); print(df[[c for c in ['geocoded_latitude','geocoded_longitude','geocoding_status'] if c in df.columns]].head())
        summary = {"total_rows":total_rows, "success_count":success_count, "fail_count":fail_count, "ai_assist_attempt":ai_assist_attempt, "ai_assist_success":ai_assist_success, "filename":file.filename}; session['processing_summary'] = summary; print(f"DEBUG: Stored summary: {summary}")
        output=io.BytesIO();
        with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name="Processed_Data"[:31].replace('/','-'), na_rep='')
        output.seek(0); print("INFO: Processed file ready.");
        return send_file(output, download_name=f"processed_{os.path.splitext(file.filename)[0]}.xlsx", as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except ValueError as e: print(f"ERROR: ValueError in process_excel: {e}"); traceback.print_exc(); return jsonify({"error":str(e),"ai_message":talk_to_bingus(f"Processing ValueErr:{e}")}), 400
    except Exception as e: print(f"🚨 ERROR: Unexpected in process_excel: {e}"); traceback.print_exc(); return jsonify({"error":f"Unexpected error:{e}","ai_message":talk_to_bingus(f"Major Server Drama:{e}")}), 500

@app.route('/get-processing-summary', methods=['GET'])
def get_processing_summary():
    summary = session.get('processing_summary', None);
    if summary: print(f"DEBUG: Retrieved summary: {summary}"); session.pop('processing_summary', None); return jsonify(summary)
    else: print("WARN: No summary in session."); return jsonify({})

@app.route('/chat', methods=['POST'])
def chat():
    """Handles user messages to the AI."""
    print("DEBUG: /chat route handler CALLED")
    if not ai_client: print("WARN: /chat - AI client not available."); return jsonify({"response": "Bingus is napping..."}), 503
    user_message = request.json.get('message')
    if not user_message: print("WARN: /chat - No message in request body."); return jsonify({"error": "No message provided"}), 400
    print(f"DEBUG: /chat - Calling talk_to_bingus for message: '{user_message[:50]}...'")
    ai_response = talk_to_bingus(f"The user says: '{user_message}'. Respond in your yassified persona.")
    print(f"DEBUG: /chat - Received response from talk_to_bingus: '{ai_response[:50]}...'")
    if "error" in ai_response.lower() or "failed" in ai_response.lower(): return jsonify({"response": ai_response}), 500 # Internal error if AI indicates failure
    return jsonify({"response": ai_response})

@app.route('/get-random-messages', methods=['GET'])
def get_random_messages():
    """Provides a list of potential random messages for pop-ups."""
    default_messages=["Default Msg 1...", "Default Msg 2..."]
    if not ai_client: print("DEBUG: RndMsg - AI N/A"); return jsonify({"messages":default_messages})
    try:
        try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p')
        except Exception: current_time_madrid="now"
        base_prompts=["Quick compliment!","Tiny sassy fact?","Encouraging words!","Chic fashion tip?","Sparkle reminder!","Madrid time comment!"]
        random.shuffle(base_prompts); selected_prompts=base_prompts[:3]; generated_messages=[]
        print(f"DEBUG: RndMsg - Requesting {len(selected_prompts)} msgs from AI...")
        for i, prompt in enumerate(selected_prompts):
            try:
                response = talk_to_bingus(prompt, max_resp_tokens=80); print(f"DEBUG: RndMsg AI resp {i+1}: '{response[:60]}...'")
                if response and isinstance(response,str) and len(response.strip())>3 and not any(e in response.lower() for e in ["error","sorry","offline","unable","can't","napping","blank","fallback","brain","circuits","connection","cannot","not programmed"]): generated_messages.append(response)
                else: print(f"WARN: RndMsg - Filtering AI resp: '{response}'")
            except Exception as e: print(f"ERROR: RndMsg - Exception gen msg {i+1}: {e}")
        final_messages = generated_messages if generated_messages else default_messages; print(f"DEBUG: RndMsg - Returning: {final_messages[:3]}"); return jsonify({"messages":final_messages[:3]})
    except Exception as e: print(f"🚨 FATAL ERROR in get_random_messages: {e}"); traceback.print_exc(); return jsonify({"messages":default_messages})

# --- Run the App ---
if __name__ == '__main__':
    print("="*50); print("✨ Starting Bingus Geocoder Flask App ✨"); print("="*50)
    if ai_client: print(f"✅ Kluster AI Client Initialized (Endpoint: {KLUSTER_BASE_URL})")
    else: print("❌ Kluster AI Client NOT Initialized - Check .env!")
    # Check if the secret key is the default unsafe one
    is_safe_key = os.getenv('FLASK_SECRET_KEY') and os.getenv('FLASK_SECRET_KEY') != 'default_unsafe_dev_key_CHANGE_ME'
    print(f"Secret Key Loaded: {'Yes (Custom)' if is_safe_key else 'No (Using default - UNSAFE!)'}")
    print("Starting Flask development server (Debug Mode)..."); print("="*50)
    # For local dev server ONLY. Render/Gunicorn uses the 'application' object from wsgi.py
    app.run(debug=True, host='0.0.0.0', port=5000)