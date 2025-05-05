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
from openai import OpenAI
from datetime import datetime, timedelta
import pytz
import traceback
import re
from whitenoise import WhiteNoise # For Render static files

# --- Load Environment Variables ---
load_dotenv() # Loads .env for local development

# --- Flask App Initialization ---
app = Flask(__name__)
# Ensure FLASK_SECRET_KEY is set in .env locally AND in Render Env Vars
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_unsafe_dev_key_CHANGE_ME")

# Configure WhiteNoise for serving static files via Gunicorn on Render
# It serves files from the 'static/' directory at the '/static/' URL prefix
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/', prefix='/static/')


# --- Geocoding Setup ---
geolocator = Nominatim(user_agent="BubblegumGeocoder/1.0 (YourAppContact@example.com)")
# Rate limit to respect Nominatim's usage policy (1 req/sec)
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1, error_wait_seconds=10)

# --- Kluster AI / OpenAI Client Setup ---
from openai import OpenAI
ai_client = OpenAI(
    api_key="81b97b07-aa83-408e-aab3-e55ceb81b2a4",
    base_url="https://api.kluster.ai/v1"
)

# --- Helper Functions ---

def find_columns(df):
    """Finds address and postcode columns (case-insensitive) in a DataFrame."""
    address_col, postcode_col = None, None
    for col in df.columns:
        col_lower = str(col).lower()
        if not address_col and ('address' in col_lower or 'street' in col_lower): address_col = col
        if not postcode_col and ('postcode' in col_lower or 'postal code' in col_lower or 'zip' in col_lower): postcode_col = col
        if address_col and postcode_col: break # Stop searching once both are found
    if not address_col or not postcode_col:
        missing_names = []
        if not address_col: missing_names.append("Address/Street")
        if not postcode_col: missing_names.append("Postcode/Postal/Zip")
        raise ValueError(f"Oh no, hun! 💅 Couldn't find columns like '{ ' or '.join(missing_names) }'. Check headers!")
    print(f"DEBUG: Found columns - Address: '{address_col}', Postcode: '{postcode_col}'")
    return address_col, postcode_col

def get_coords(address, postcode, row_num):
    """Geocodes a single address using Nominatim, with logging and error handling."""
    address_str = str(address).strip() if pd.notna(address) else ""
    postcode_str = str(postcode).strip() if pd.notna(postcode) else ""
    print(f"--- Row {row_num} ---")
    print(f"DEBUG (Row {row_num}): Input Address='{address_str}', Postcode='{postcode_str}'")
    if not address_str and not postcode_str: print(f"DEBUG (Row {row_num}): Skipping - Empty input."); return None, None

    # Use simple combined string query for Nominatim
    parts = [part for part in [address_str, postcode_str] if part]
    full_address = ", ".join(parts)
    if not full_address: print(f"DEBUG (Row {row_num}): Skipping - Combined query empty."); return None, None

    print(f"DEBUG (Row {row_num}): Attempting simple query: '{full_address}'"); query_input = full_address
    location = None
    try:
        # Note: Adding country_codes='ES' might improve accuracy for Spain
        location = geocode(query_input, language='en', timeout=15)
        print(f"DEBUG (Row {row_num}): Nominatim returned: {location}")
        # Safer attribute checking before accessing latitude/longitude
        if location and hasattr(location, 'latitude') and location.latitude is not None and hasattr(location, 'longitude') and location.longitude is not None:
            lat, lon = round(location.latitude, 6), round(location.longitude, 6)
            print(f"SUCCESS (Row {row_num}): Found ({lat}, {lon})"); return lat, lon
        else: print(f"INFO (Row {row_num}): Geocode failed - Not found by Nominatim."); return None, None
    except Exception as e: print(f"🚨 ERROR (Row {row_num}): Geocoding exception for '{query_input}':"); traceback.print_exc(); return None, None

# --- AI Interaction Function (Using Bingus with Qwen3 default) ---
def talk_to_bingus(prompt, user_name=None, conversation_history=[], model_name="Qwen/Qwen3-235B-A22B-FP8", max_resp_tokens=4000, temperature=2.0, language='auto'):
    """Sends prompt to Kluster AI (Qwen3), parses thinking/response, returns dict. Adds Spanish support if needed."""
    print(f"DEBUG: talk_to_bingus called (Model: {model_name}, Temp: {temperature}, Lang: {language}) for prompt: '{prompt[:60]}...'")
    if not ai_client:
        print("WARN: talk_to_bingus - AI client N/A.")
        return {"error": "AI offline... Bingus napping..."}
    try:
        # Add Spanish support
        lang_instruction = "You must always reply in Spanish (español), but keep Bingus's personality and style!" if language == 'es' else ""
        context_instruction = ""
        if conversation_history and isinstance(conversation_history, list) and len(conversation_history) > 0:
            context_instruction = f"\nHere is the recent chat context: {conversation_history[-3:]}"
        system_prompt = (
            "You are Bingus, a creative, witty, and ultra-supportive AI assistant for the Bubblegum Geocoder web app. "
            "You are a fat, hairless sphynx cat with a love for fashion, fun, and helping users. "
            "Always address the user by their name if provided. "
            "Be highly personalized, creative, and never generic.\n"
            "Make every answer relevant to the user's question and their recent chat context.\n"
            "Add fun, sassy, and supportive energy.\n"
            "Keep responses short, chatty, and full of personality.\n"
            "NEVER output meta tags or reasoning steps.\n"
            "FIRST, think step-by-step within <think></think> tags. THEN, provide the final chat response outside the tags.\n"
            f"{lang_instruction}"
            f"{context_instruction}"
        )
        if user_name:
            system_prompt += f"\nThe user's name is: {user_name}. Address them directly!"
        else:
            system_prompt += "\nIf you don't know the user's name, ask for it in a fun way."
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
        completion = ai_client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=max_resp_tokens,
            temperature=temperature,
            top_p=1
        )
        if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
            ai_response_raw = completion.choices[0].message.content
            print(f"DEBUG: Raw AI response: '{ai_response_raw[:150]}...'")
            thinking_text = None
            response_text = ai_response_raw # Default to full response
            # Parse thinking and response parts
            think_match = re.search(r"<think>(.*?)</think>(.*)", ai_response_raw, re.DOTALL | re.IGNORECASE)
            if think_match:
                thinking_text = think_match.group(1).strip()
                response_text = think_match.group(2).strip()
                print(f"DEBUG: Parsed Thinking: '{thinking_text[:60]}...'")
                print(f"DEBUG: Parsed Response: '{response_text[:60]}...'")
            elif ai_response_raw.strip().startswith("<think>"):
                 # Handle case where only thinking is returned (error?)
                 thinking_text = ai_response_raw.strip()
                 response_text = "Bingus got lost in thought... ✨"
                 print(f"WARN: Only <think> tag found? Raw: {ai_response_raw}")
            if not response_text:
                 response_text = "Bingus is speechless... ✨" # Fallback if response is empty after parsing
            return {"thinking": thinking_text, "response": response_text}
        return {"response": "OMG, my brain went blank 🧠..."}
    except Exception as e:
        print(f"ERROR: Bingus AI error: {e}")
        return {"error": f"Bingus AI error: {e}"}

# --- Flask Routes ---

@app.route('/')
def index():
    """Renders the main page, clears any old summary."""
    session.pop('processing_summary', None)
    return render_template('index.html')

@app.route('/process-excel', methods=['POST'])
def process_excel():
    """Handles file upload, geocoding with AI assist, returns file."""
    # File Upload Checks
    if 'file' not in request.files or not request.files['file'] or not request.files['file'].filename:
        return jsonify({"error":"No file selected!","ai_message":talk_to_bingus("Tell user: no file selected")}), 400
    file = request.files['file']
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return jsonify({"error":"Invalid file type! (.xlsx/.xls only)","ai_message":talk_to_bingus("Tell user: wrong file type")}), 400

    try:
        print(f"INFO: Processing file: {file.filename}..."); df = pd.read_excel(file);
        if df.empty: raise ValueError("Uploaded file is empty")
        address_col, postcode_col = find_columns(df)

        results, geocoding_statuses = [], [];
        success_count, fail_count, ai_assist_success, ai_assist_attempt, total_rows = 0, 0, 0, 0, len(df)
        print(f"INFO: Starting geocoding for {total_rows} rows..."); print("="*20 + " Geocoding Log " + "="*20)

        # --- Geocoding Loop ---
        for index, row in df.iterrows():
            row_num = index + 2; address_value = row.get(address_col); postcode_value = row.get(postcode_col); status = "Failed"
            lat, lon = get_coords(address_value, postcode_value, row_num)

            # AI Assist Logic
            if lat is None or lon is None:
                ai_assist_attempt += 1
                if ai_client:
                    ai_prompt=f"Fix geocode fail: Addr='{address_value}', Postcode='{postcode_value}'. Reply ONLY with corrected address string or 'FAIL'."
                    # AI Assist uses the default model (Qwen3) but with lower temp & fewer tokens for factual correction
                    print(f"DEBUG (R{row_num}): Calling AI Assist (Model: Qwen3, Temp: 0.5)...")
                    # Pass lower temperature and specific max tokens for this task
                    ai_sugg_dict = talk_to_bingus(ai_prompt, max_resp_tokens=60, temperature=0.5)
                    ai_sugg_raw = ai_sugg_dict.get("response") # Get the response part
                    print(f"DEBUG (R{row_num}): AI assist raw sugg: '{ai_sugg_raw}'")
                    ai_sugg = None
                    # Filter suggestion (ensure ai_sugg_raw is a string before checks)
                    if ai_sugg_raw and isinstance(ai_sugg_raw, str) and "FAIL" not in ai_sugg_raw.upper() and len(ai_sugg_raw.strip()) > 5 and not any(e in ai_sugg_raw.lower() for e in ["sorry", "unable", "<think>"]):
                        ai_sugg = ai_sugg_raw.strip().strip('"\'')
                        print(f"DEBUG(R{row_num}): Using AI sugg: '{ai_sugg}'")
                        print(f"INFO (R{row_num}): Re-trying geocode w/ AI suggestion...")
                        lat_ai, lon_ai = get_coords(ai_sugg, "", row_num)
                        if lat_ai is not None and lon_ai is not None:
                            lat, lon = lat_ai, lon_ai
                            status = "Success(AI Assist)"
                            ai_assist_success += 1
                            print(f"SUCCESS(R{row_num}): AI Assist OK!")
                        else:
                            status = "Failed(AI Tried)"
                            print(f"INFO(R{row_num}): AI Assist Failed.")
                    else:
                        status = "Failed(AI Skip/FAIL)"
                        print(f"INFO(R{row_num}): AI unusable sugg ('{ai_sugg_raw}').")
                else:
                    status = "Failed(AI N/A)"
                    print(f"WARN(R{row_num}): AI N/A.")

            if lat is not None and lon is not None and status=="Failed": status="Success(Primary)"
            results.append({'latitude':lat,'longitude':lon}); geocoding_statuses.append(status); print(f"DEBUG(R{row_num}): Appended: Status:'{status}'")
            if status.startswith("Success"): success_count += 1 
            else: fail_count += 1
        # --- End Geocoding Loop ---

        print("="*20 + " Geocoding End " + "="*24); print(f"INFO: Geocoding done. Success:{success_count}, Fail:{fail_count}, AI Attempts:{ai_assist_attempt}, AI Success:{ai_assist_success}")
        df['geocoded_latitude']=[r['latitude'] for r in results]; df['geocoded_longitude']=[r['longitude'] for r in results]; df['geocoding_status']=geocoding_statuses
        print("DEBUG: DataFrame head:"); print(df[[c for c in ['geocoded_latitude','geocoded_longitude','geocoding_status'] if c in df.columns]].head())
        # Store summary in session
        summary = {"total_rows":total_rows, "success_count":success_count, "fail_count":fail_count, "ai_assist_attempt":ai_assist_attempt, "ai_assist_success":ai_assist_success, "filename":file.filename}; session['processing_summary'] = summary; print(f"DEBUG: Stored summary.")
        # Save & Send File
        output=io.BytesIO();
        with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name="Processed_Data"[:31].replace('/','-'), na_rep='')
        output.seek(0); print("INFO: Processed file ready.");
        return send_file(output, download_name=f"processed_{os.path.splitext(file.filename)[0]}.xlsx", as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except ValueError as e: print(f"ERROR: ValueError in process_excel: {e}"); traceback.print_exc(); return jsonify({"error":str(e),"ai_message":talk_to_bingus(f"Processing ValueErr:{e}")}), 400
    except Exception as e: print(f"🚨 ERROR: Unexpected in process_excel: {e}"); traceback.print_exc(); return jsonify({"error":f"Unexpected error:{e}","ai_message":talk_to_bingus(f"Major Server Drama:{e}")}), 500

@app.route('/get-processing-summary', methods=['GET'])
def get_processing_summary():
    """Retrieves summary data from session after processing."""
    summary = session.get('processing_summary', None);
    if summary: print(f"DEBUG: Retrieved summary: {summary}"); session.pop('processing_summary', None); return jsonify(summary)
    else: print("WARN: No summary in session."); return jsonify({})

@app.route('/chat', methods=['POST'])
def chat():
    print("DEBUG: /chat route handler CALLED")
    data = request.get_json()
    user_message = data.get('message')
    user_name = data.get('userName') or 'Gorgeous'
    # Detect if the message is in Spanish or user wants Spanish
    language = 'es' if (user_message and (user_message.strip().startswith('es:') or 'español' in user_message.lower() or re.search(r'[áéíóúñ¿¡]', user_message))) else 'auto'
    ai_result = talk_to_bingus(user_message, user_name=user_name, language=language)
    if "error" in ai_result:
        return jsonify({"response": ai_result["error"]}), 500
    return jsonify(ai_result)

@app.route('/generate-image', methods=['POST'])
def generate_image():
    """Generates an image using the AI client based on a fixed prompt."""
    print("DEBUG: /generate-image route handler CALLED")
    data = request.get_json()
    user_name = data.get('userName') or 'Gorgeous'

    if not ai_client:
        print("WARN: /generate-image - AI client N/A.")
        # Provide a Bingus-style error message
        error_response = talk_to_bingus(f"Tell {user_name} the image generator isn't working right now.", user_name)
        return jsonify({"error": "AI offline... Bingus's art studio is closed...", "response": error_response}), 503 # Service Unavailable

    try:
        # Fixed prompt for generating Bingus
        image_prompt = "A cute, slightly chubby, hairless sphynx cat (Bingus) wearing a tiny pink bow tie, digital art style, vibrant colors."
        print(f"DEBUG: Generating image with prompt: '{image_prompt}'")

        # --- Attempt to call the image generation endpoint ---
        # NOTE: Assuming Kluster AI uses an OpenAI-compatible API structure.
        # The exact endpoint and parameters might differ for Kluster.
        # The error message suggested POST /v1/images/generations
        response = ai_client.images.generate(
            model="sdxl-lightning", # Or another suitable image model available via Kluster
            prompt=image_prompt,
            n=1, # Generate one image
            size="512x512" # Specify image size if needed
        )

        print(f"DEBUG: Image generation API response: {response}")

        if response.data and len(response.data) > 0 and response.data[0].url:
            image_url = response.data[0].url
            print(f"SUCCESS: Image generated: {image_url}")
            # Get a Bingus comment about the image
            bingus_comment = talk_to_bingus(f"Comment on the image you just generated for {user_name}. The prompt was: {image_prompt}", user_name)
            return jsonify({"image_url": image_url, "response": bingus_comment})
        else:
            print("ERROR: Image generation failed - No URL in response.")
            error_response = talk_to_bingus(f"Tell {user_name} you tried to draw but couldn't finish the picture.", user_name)
            return jsonify({"error": "Image generation failed (no URL).", "response": error_response}), 500

    except Exception as e:
        print(f"🚨 ERROR: Unexpected error in /generate-image: {e}")
        traceback.print_exc()
        # Check if it's the specific 404 error from the screenshot
        if "404" in str(e) and "images/generations" in str(e):
             error_message = "Bingus can't find the magic paint right now! (Image endpoint missing?)"
             bingus_comment = talk_to_bingus(f"Tell {user_name} you couldn't find the image tool.", user_name)
        else:
            error_message = f"Bingus had an art emergency! ({type(e).__name__})"
            bingus_comment = talk_to_bingus(f"Tell {user_name} there was an unexpected problem while drawing.", user_name)

        return jsonify({"error": error_message, "response": bingus_comment}), 500

@app.route('/get-random-messages', methods=['GET'])
def get_random_messages():
    prompts = [
        "Quick compliment!",
        "Tiny sassy fact?",
        "Encouraging words!",
        "Chic fashion tip?",
        "Sparkle reminder!"
    ]
    messages = []
    default_messages = ["Sparkle On! ✨", "You're doing great!💖", "Slay! 🔥"]
    for prompt in prompts:
        # talk_to_bingus now returns a dict, we only need the response part here
        resp_dict = talk_to_bingus(prompt)
        if resp_dict and "response" in resp_dict and resp_dict["response"]:
            # Basic filtering for random messages
            resp_text = resp_dict["response"]
            if not any(e in resp_text.lower() for e in ["error","sorry","offline","unable","can't","napping","blank"]):
                 messages.append(resp_text)
    if not messages:
        messages = default_messages
    return jsonify({"messages": messages})

# --- Run the App ---
if __name__ == '__main__':
    print("="*50); print("✨ Starting Bingus Geocoder Flask App ✨"); print("="*50)
    if ai_client: print(f"✅ Kluster AI Client Initialized (Endpoint: {KLUSTER_BASE_URL})")
    else: print("❌ Kluster AI Client NOT Initialized - Check .env!")
    is_safe_key = os.getenv('FLASK_SECRET_KEY') and os.getenv('FLASK_SECRET_KEY') != 'default_unsafe_dev_key_CHANGE_ME'
    print(f"Secret Key Loaded: {'Yes (Custom)' if is_safe_key else 'No (Using default - UNSAFE!)'}")
    print("Starting Flask development server (Debug Mode)..."); print("="*50)
    # The app.run() line is only for local development testing.
    # Render uses Gunicorn specified in the Procfile to run the 'application' from wsgi.py.
    app.run(debug=True, host='0.0.0.0', port=5000)