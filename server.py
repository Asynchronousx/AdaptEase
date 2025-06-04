from flask import Flask, request, jsonify
from flask_cors import CORS
from model import chunk, simplify


# --- 1. Initialize Flask App and Model Handler ---
# Initializes the Flask application.
# The __name__ argument tells Flask where to look for static files and templates.
app = Flask(__name__)

# Applies CORS (Cross-Origin Resource Sharing) to the Flask app.
# This allows web pages from different domains to make requests to this server.
CORS(app)

# --- 2. Flask API Endpoints ---
# Defines a route for the API endpoint '/api/text-in-blocks'.
# This decorator maps the URL path to the function below it.
# It specifies that this endpoint only accepts HTTP POST requests.
# We also define the function that will handle requests to the '/api/text-in-blocks' endpoint.
# This function is responsible for receiving text, chunking it, and returning the result.
@app.route('/api/text-in-blocks', methods=['POST'])
def text_in_blocks_endpoint():

    # Checks if the incoming request's content type is JSON.
    # Flask's request.is_json property is True if the Content-Type header is 'application/json'.
    if not request.is_json:

        # If the request is not JSON, returns a JSON error message and a 400 Bad Request status code.
        return jsonify({"error": "Request must be JSON"}), 400

    # Parses the JSON data from the incoming request body.
    # request.get_json() automatically parses the JSON into a Python dictionary.
    data = request.get_json()

    # Extracts the value associated with the 'text' key from the JSON data.
    # .get() is used to safely access dictionary keys, returning None if the key is not found.
    original_text = data.get('text')
    
    # Extracts the value associated with the 'lang' key from the JSON data.
    # If 'lang' is not provided, it defaults to 'en' (English).
    language = data.get('lang', 'en') # Get 'lang' or default to 'en'

    # Checks if the 'text' field is missing from the JSON payload (i.e., it's None).
    if original_text is None:
        
        # If 'text' is missing, returns an error message and a 400 Bad Request status code.
        return jsonify({"error": "Missing 'text' field in JSON payload"}), 400
    
    # Checks if the 'text' field is not a string OR if it's an empty string after stripping leading/trailing whitespace.
    if not isinstance(original_text, str) or not original_text.strip():
       
        # If 'text' fails validation, returns an error message and a 400 Bad Request status code.
        return jsonify({"error": "'text' field must be a non-empty string"}), 400

    # Starts a try-except block to handle potential errors during the text processing.
    try:

        # Prints the received text block to the console for debugging purposes.
        print(f"Received text block for chunking: OK")

        # Prints the detected or provided language to the console for debugging.
        print(f"Target Language: {language}")

        # Calls the 'chunk_article' function from the model module.
        # It passes the 'original_text' and the 'language' to the function.
        # The [2] at the end indicates that the 'chunk_article' function returns a tuple or list,
        # and we are interested in the third element (index 2), which is assumed to be the chunked blocks.
        chunked_blocks = chunk(original_text, lang=language)[2]

        # Returns a JSON response containing the processed (chunked) text.
        # jsonify converts the Python dictionary into a JSON string.
        # The HTTP status code defaults to 200 OK if not specified.
        return jsonify({"processed_text": chunked_blocks})
    
    # Catches any exception that occurs within the try block.
    except Exception as e:

        # Prints the specific error message to the console for debugging.
        print(f"Error in /api/text-in-blocks: {e}")
        
        # Returns a JSON response with a generic error message and the specific error details.
        # Sets the HTTP status code to 500 Internal Server Error, indicating a server-side issue.
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

# Defines a route for the API endpoint '/api/simplify-text'.
# This decorator maps the URL path to the function below it.
# It specifies that this endpoint only accepts HTTP POST requests.
# Defines the function that will handle requests to the '/api/simplify-text' endpoint.
# This function is responsible for receiving text, simplifying it, and returning the result.
@app.route('/api/simplify-text', methods=['POST'])
def simplify_text_endpoint():

    # Checks if the incoming request's content type is JSON.
    if not request.is_json:

        # If the request is not JSON, returns an error message and a 400 Bad Request status code.
        return jsonify({"error": "Request must be JSON"}), 400

    # Parses the JSON data from the incoming request body.
    data = request.get_json()
    
    # Extracts the value associated with the 'text' key from the JSON data.
    original_text = data.get('text')
    
    # Extracts the value associated with the 'lang' key from the JSON data, defaulting to 'en'.
    language = data.get('lang', 'en') # Get 'lang' or default to 'en'

    # Checks if the 'text' field is missing from the JSON payload.
    if original_text is None:
        
        # If 'text' is missing, returns an error message and a 400 Bad Request status code.
        return jsonify({"error": "Missing 'text' field in JSON payload"}), 400
    
    # Checks if the 'text' field is not a string OR if it's an empty string after stripping whitespace.
    if not isinstance(original_text, str) or not original_text.strip():
        
        # If 'text' fails validation, returns an error message and a 400 Bad Request status code.
        return jsonify({"error": "'text' field must be a non-empty string"}), 400

    # Starts a try-except block to handle potential errors during the text processing.
    try:

        # Prints the received text block to the console for debugging purposes.
        print(f"Received text block for simplification: OK")
        # Prints the detected or provided language to the console for debugging.
        print(f"Target Language: {language}")

        # Calls the 'simplify_text' function from the 'raw_qwen' module.
        # It passes the 'original_text' and the 'language' to the function.
        simplified_text_output = simplify(original_text, lang=language)

        # Returns a JSON response containing the processed (simplified) text.
        return jsonify({"processed_text": simplified_text_output})
    
    # Catches any exception that occurs within the try block.
    except Exception as e:
    
        # Prints the specific error message to the console for debugging.
        print(f"Error in /api/simplify-text: {e}")
    
        # Returns a JSON response with a generic error message and the specific error details.
        # Sets the HTTP status code to 500 Internal Server Error.
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

# --- 3. Run Flask App ---
# This block ensures that the Flask development server only runs when the script is executed directly.
# It will not run if the script is imported as a module into another script.
if __name__ == '__main__':

    # This comment provides a reminder that for production deployments, a robust WSGI server
    # like Gunicorn or uWSGI should be used instead of Flask's built-in development server.
    # The 'host='0.0.0.0'' setting makes the server accessible from any external IP address,
    # not just from the local machine (localhost).
    # Runs the Flask development server.
    # debug=True: Enables debug mode, which provides a debugger for errors and auto-reloads the server on code changes.
    # use_reloader=False: Prevents the server from starting twice, which can happen with debug=True.
    # host='0.0.0.0': Makes the server publicly accessible on the network.
    # port=5000: Specifies that the server should listen for requests on port 5000.
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)


