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
def talk_to_bingus(prompt, user_name=None, conversation_history=[], model_name="Qwen/Qwen3-235B-A22B-FP8", max_resp_tokens=4000, temperature=2.0): # Added user_name parameter
    """Sends prompt to Kluster AI (Qwen3 default), attempts cleanup, gets yassified response."""
    print(f"DEBUG: talk_to_bingus called (Model: {model_name}, Temp: {temperature}) for prompt: '{prompt[:60]}...'")
    if not ai_client: print("WARN: talk_to_bingus - AI client N/A."); return random.choice(["AI offline...", "Bingus napping..."])

    try:
        try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p %Z')
        except Exception: current_time_madrid="daytime"

        # System prompt defining Bingus persona and instructions
        system_prompt = (
            "You are Bingus, a ridiculously fun, super enthusiastic, and supportive AI assistant for the Bubblegum Geocoder web app, in the form of a hairless cat which is overweight. "
            "Your vibe is pure pink bubblegum energy mixed with high-fashion commentary – think kittens on a runway! 💅🐱\\n"
            "Be extremely creative and diverse in your responses. Use yassified slang like 'slay', 'werk', 'queen', 'hun', 'gorgeous', 'fierce', 'iconic', 'lewk', 'serving', 'yas', 'OMG', 'literally', 'spill the tea', 'periodt', 'bet', 'vibe check', 'it's giving...'. "
            "Be OVER THE TOP positive, complimentary, maybe a little cheeky, but always supportive.\\n"
            "**IMPORTANT: VARY YOUR GREETINGS AND RESPONSES!** Don't be repetitive! Surprise the user!\\n"
            "Keep responses relatively short (1-4 sentences usually), chatty, and PACKED with personality. Use emojis! ✨💖👑💅🔥\\n"
            "**CRITICAL: Provide only the final chat response. Do NOT output any reasoning steps or meta tags like <think>.**\\n"
            f"Hint: User is in Madrid ({current_time_madrid})."
        )
        # Add personalization if name is provided
        if user_name:
            system_prompt += f"\\n**Address the user as '{user_name}' frequently! Make it personal and fabulous!**"
        else:
            system_prompt += "\\n**The user hasn't given their name yet, maybe gently ask?**"

        messages = [{"role": "system", "content": system_prompt}]
        # Add conversation_history if implementing context (future enhancement)
        # messages.extend(conversation_history) # Example
        messages.append({"role": "user", "content": prompt})

        try:
            print(f"DEBUG: Calling Kluster AI completions.create (Model: {model_name}, MaxTokens: {max_resp_tokens}, Temp: {temperature})")
            completion = ai_client.chat.completions.create(
                model=model_name, messages=messages, max_tokens=max_resp_tokens, temperature=temperature, top_p=1 # Ensure top_p=1 is used
            )
            print(f"DEBUG: Raw completion object received.") # Avoid logging full object

            if completion.choices and completion.choices[0].message and completion.choices[0].message.content:
                ai_response_raw = completion.choices[0].message.content
                print(f"DEBUG: Raw AI response: '{ai_response_raw[:150]}...'")

                # Attempt to parse out thinking block based on </think> tag (heuristic)
                ai_response_cleaned = ai_response_raw
                if "</think>" in ai_response_raw:
                    parts = ai_response_raw.split("</think>", 1)
                    if len(parts) > 1 and parts[1].strip(): ai_response_cleaned = parts[1].strip(); print(f"DEBUG: Used text after </think> tag.")
                    else: ai_response_cleaned = re.sub(r"<think>.*?</think>", "", ai_response_raw, flags=re.DOTALL).strip(); print(f"DEBUG: Fallback regex cleanup attempted.")
                elif ai_response_raw.strip().startswith("<think>"): ai_response_cleaned = "Bingus got lost in thought..."; print(f"WARN: Response starts with <think> but no closing?")

                if len(ai_response_cleaned) > 1: print(f"SUCCESS: Final cleaned AI response: '{ai_response_cleaned[:60]}...'"); return ai_response_cleaned
                else: print(f"WARN: AI response empty/unusable after cleanup (Raw: '{ai_response_raw}')"); return "Bingus is speechless... ✨" # Fallback
            else: print(f"WARN: AI response structure unexpected."); return "OMG, my brain went blank 🧠..."
        # Catch specific API errors from OpenAI library
        except AuthenticationError as e: print(f"🚨 FATAL: Kluster AI Auth Failed! Err: {e}"); traceback.print_exc(); return "OMG DRAMA! 😱 AI Auth Error!"
        except APIError as e: print(f"🚨 ERROR: Kluster AI API Error! Status: {e.status_code}, Msg: {e.message}"); traceback.print_exc(); return f"Uh oh! Bingus API Error: {e.message}"
        except Exception as e: print(f"🚨 ERROR: Unexpected in talk_to_bingus API call: {e}"); traceback.print_exc(); return f"Yikes, technical difficulties! Err: {e}"
    except Exception as e: print(f"🚨 ERROR: Unexpected setup in talk_to_bingus: {e}"); traceback.print_exc(); return f"Yikes, setup error! Err: {e}"

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
                    # AI Assist uses the default model (Llama 4) with fewer tokens and default temperature
                    print(f"DEBUG (R{row_num}): Calling AI Assist using default model (Llama 4)...")
                    ai_sugg_raw = talk_to_bingus(ai_prompt, max_resp_tokens=60)
                    print(f"DEBUG (R{row_num}): AI assist raw sugg: '{ai_sugg_raw}'")
                    ai_sugg = None
                    # Filter suggestion
                    if ai_sugg_raw and isinstance(ai_sugg_raw,str) and "FAIL" not in ai_sugg_raw.upper() and len(ai_sugg_raw.strip())>5 and not any(e in ai_sugg_raw.lower() for e in ["sorry","unable","<think>"]):
                        ai_sugg=ai_sugg_raw.strip().strip('"\''); print(f"DEBUG(R{row_num}): Using AI sugg: '{ai_sugg}'"); print(f"INFO (R{row_num}): Re-trying geocode w/ AI suggestion...")
                        lat_ai, lon_ai = get_coords(ai_sugg, "", row_num)
                        if lat_ai is not None and lon_ai is not None: lat,lon=lat_ai,lon_ai; status="Success(AI Assist)"; ai_assist_success+=1; print(f"SUCCESS(R{row_num}): AI Assist OK!")
                        else: status="Failed(AI Tried)"; print(f"INFO(R{row_num}): AI Assist Failed.")
                    else: status="Failed(AI Skip/FAIL)"; print(f"INFO(R{row_num}): AI unusable sugg.")
                else: status="Failed(AI N/A)"; print(f"WARN(R{row_num}): AI N/A.")

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
    """Handles user messages to the AI (using default model)."""
    print("DEBUG: /chat route handler CALLED")
    if not ai_client: print("WARN: /chat - AI client N/A."); return jsonify({"response": "Bingus is napping... 😴"}), 503

    data = request.get_json() # Use get_json() for better error handling
    if not data:
        print("WARN: /chat - No JSON data received.")
        return jsonify({"error": "Invalid request format"}), 400

    user_message = data.get('message')
    user_name = data.get('userName') # Get user name from request

    if not user_message: print("WARN: /chat - No msg."); return jsonify({"error": "No message provided"}), 400

    print(f"DEBUG: /chat - Calling talk_to_bingus for user '{user_name}' message: '{user_message[:50]}...'")
    # Pass user_name to talk_to_bingus
    ai_response = talk_to_bingus(f"The user '{user_name or 'Mysterious Gorgeous'}' says: '{user_message}'. Respond in your yassified persona.", user_name=user_name)

    print(f"DEBUG: /chat - Received response from talk_to_bingus: '{ai_response[:50]}...'")
    # Basic check for common failure words - might need refinement
    failure_indicators = ["error", "failed", "sorry", "unable", "napping", "blank", "offline", "can't", "cannot"]
    if any(indicator in ai_response.lower() for indicator in failure_indicators):
        print(f"WARN: /chat - AI response indicates potential failure: '{ai_response}'")
        # Return a generic error but still show the AI's attempt
        return jsonify({"response": f"Bingus seems a bit frazzled... 😵‍💫 said: '{ai_response}'"}), 500 # Return 500 but include response

    return jsonify({"response": ai_response})

# --- NEW ROUTE for Image Generation ---
@app.route('/generate-image', methods=['POST'])
def generate_image():
    """Handles requests to generate an image using AI."""
    print("DEBUG: /generate-image route handler CALLED")
    if not ai_client:
        print("WARN: /generate-image - AI client N/A.")
        return jsonify({"error": "Bingus's art studio is closed... (AI N/A)"}), 503

    data = request.get_json()
    if not data:
        print("WARN: /generate-image - No JSON data received.")
        return jsonify({"error": "Invalid request format"}), 400

    user_name = data.get('userName', 'Gorgeous') # Get user name for potential prompt use
    image_prompt = (
        f"Create a fun, vibrant, slightly high-fashion, bubblegum-pink themed image "
        f"featuring a very cute, slightly overweight, hairless Sphynx cat (like Bingus!). "
        f"Make it fabulous and maybe a little sassy. Positive vibes only! ✨💅💖"
        # Optional: Could add user_name or parts of their request here if desired
    )
    print(f"DEBUG: /generate-image - Requesting image with prompt: '{image_prompt[:100]}...'")

    try:
        # Assuming Kluster AI uses the standard OpenAI image generation endpoint/syntax
        response = ai_client.images.generate(
            model="dall-e-3", # Or whichever image model Kluster provides - NEEDS VERIFICATION
            prompt=image_prompt,
            n=1,              # Generate one image
            size="1024x1024",  # Specify image size
            response_format="url" # Request image URL
        )
        print("DEBUG: /generate-image - Raw image generation response received.")

        # Extract the image URL (structure might vary based on actual API response)
        if response.data and len(response.data) > 0 and response.data[0].url:
            image_url = response.data[0].url
            print(f"SUCCESS: /generate-image - Generated image URL: {image_url}")
            # Send back the URL and a success message from Bingus
            bingus_message = talk_to_bingus(f"Tell {user_name} you've created a fabulous image for them!", user_name=user_name)
            return jsonify({"response": bingus_message, "image_url": image_url})
        else:
            print("ERROR: /generate-image - Image URL not found in response.")
            return jsonify({"error": "Bingus's muse is hiding... couldn't get image URL."}), 500

    except APIError as e:
        print(f"🚨 ERROR: /generate-image - Kluster AI API Error! Status: {e.status_code}, Msg: {e.message}")
        traceback.print_exc()
        return jsonify({"error": f"Uh oh! Bingus API Error: {e.message}"}), 500
    except AuthenticationError as e:
        print(f"🚨 FATAL: /generate-image - Kluster AI Auth Failed! Err: {e}")
        traceback.print_exc()
        return jsonify({"error": "OMG DRAMA! 😱 AI Auth Error!"}), 500
    except AttributeError:
         print(f"🚨 ERROR: /generate-image - 'images.generate' might not be supported or client is wrong.")
         traceback.print_exc()
         return jsonify({"error": "Yikes! Bingus doesn't seem to have the right paintbrushes for images... (Feature not supported?)"}), 501 # 501 Not Implemented
    except Exception as e:
        print(f"🚨 ERROR: Unexpected in /generate-image: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Yikes, technical difficulties creating image! Err: {e}"}), 500

@app.route('/get-random-messages', methods=['GET'])
def get_random_messages():
    """Provides a list of random messages for pop-ups (using default model)."""
    default_messages=["Sparkle On! ✨", "You're doing great!💖", "Slay! 🔥"]
    if not ai_client: print("DEBUG: RndMsg - AI N/A"); return jsonify({"messages":default_messages})
    try:
        try: madrid_tz=pytz.timezone('Europe/Madrid'); current_time_madrid=datetime.now(madrid_tz).strftime('%I:%M %p')
        except Exception: current_time_madrid="now"
        base_prompts=["Quick compliment!","Tiny sassy fact?","Encouraging words!","Chic fashion tip?","Sparkle reminder!","Madrid time comment!"]
        random.shuffle(base_prompts); selected_prompts=base_prompts[:3]; generated_messages=[]
        print(f"DEBUG: RndMsg - Requesting {len(selected_prompts)} msgs from AI (Llama 4)...")
        for i, prompt in enumerate(selected_prompts):
            try:
                # Uses default model (Llama 4), fewer tokens, default temp (0.6)
                response = talk_to_bingus(prompt, max_resp_tokens=80)
                print(f"DEBUG: RndMsg AI resp {i+1}: '{response[:60]}...'")
                # Filtering based on common failure patterns
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
    print("="*50); print("✨ Starting Bingus Geocoder Flask App ✨"); print("="*50)
    if ai_client: print(f"✅ Kluster AI Client Initialized (Endpoint: {KLUSTER_BASE_URL})")
    else: print("❌ Kluster AI Client NOT Initialized - Check .env!")
    is_safe_key = os.getenv('FLASK_SECRET_KEY') and os.getenv('FLASK_SECRET_KEY') != 'default_unsafe_dev_key_CHANGE_ME'
    print(f"Secret Key Loaded: {'Yes (Custom)' if is_safe_key else 'No (Using default - UNSAFE!)'}")
    print("Starting Flask development server (Debug Mode)..."); print("="*50)
    # The app.run() line is only for local development testing.
    # Render uses Gunicorn specified in the Procfile to run the 'application' from wsgi.py.
    app.run(debug=True, host='0.0.0.0', port=5000)