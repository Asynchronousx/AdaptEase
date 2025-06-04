import torch
import json
import re
import os
from transformers import AutoTokenizer, AutoModelForCausalLM

# --- 0. Language Configuration  ---
LANGUAGE_MAP = {
    "en": "English",
    "it": "Italiano",
    "es": "Español",
    "fr": "Français",
    "de": "Deutsch",
    # Add more languages as needed
}

# File paths for files (in our case, the prompts)
CHUNK_PROMPT_FILE_PATH = "assets/prompts/chunk_prompts.json"
SIMPLIFY_PROMPT_FILE_PATH = "assets/prompts/simplify_prompts.json"

# --- 1. Global Configuration & Model Loading ---
# Since this file will be called ONCE from a python flask application on the module import, 
# We choose to rely on the lazy init offered natively by python for the model and it's variable by putting 
# the configuration in this file and avoid overcomplicating it with classes and other structures (KISS!)
# Since FLASK is smart and know how to manage things, we'll let the framework handle the workload itself. 

# Now, we retrieve the Hugging Face authentication token from environment variables.
# This is crucial for accessing private models or for rate limits on public models.
# os.getenv() safely retrieves the variable, defaulting to a placeholder if not found.
# IMPORTANT: In a production environment, ensure 'HF_TOKEN' is set securely and never hardcode sensitive tokens.
# For usage: 
# 1. Assure HF_TOKEN is set in your env. In this case, the second parameter is not needed (your actual token)
# 2. If you don't want to set the HF_TOKEN in your env, just paste your actual HF token in the second parameter.
hf_token = os.getenv("HF_TOKEN", "YOUR_TOKEN")

# Determines the computational device to use for model inference.
# torch.cuda.is_available() checks if a CUDA-enabled GPU is present.
# If a GPU is available, 'cuda' is chosen; otherwise, it defaults to 'cpu'.
device = "cuda" if torch.cuda.is_available() else "cpu"

# Defines the name of the pre-trained model to be loaded from Hugging Face.
# This specific model is "Qwen/Qwen1.5-0.5B-Chat", a relatively small conversational model.
model_name = "Qwen/Qwen3-32B"

# Loads the tokenizer for the specified pre-trained model.
# The 'token' argument is used for authentication with Hugging Face Hub.
# 'trust_remote_code=True' is necessary for some models that include custom Python code in their repository.
tokenizer = AutoTokenizer.from_pretrained(model_name, token=hf_token, trust_remote_code=True)

# Loads the pre-trained causal conversational language model.
# torch_dtype=torch.float16: Loads the model weights in half-precision (FP16) to reduce memory usage and potentially speed up inference on compatible hardware.
# token: Used for authentication.
# trust_remote_code=True: Required for models with custom code.
# device_map="auto": Automatically distributes the model layers across available devices (e.g., multiple GPUs, or CPU if no GPU).
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    token=hf_token,
    trust_remote_code=True,
    device_map="auto"
)

# Sets the model to evaluation mode.
# This disables features like dropout and batch normalization, which are used during training but not during inference.
model.eval()

# If the tokenizer pad id isn't configured
if tokenizer.pad_token_id is None:

    # But we got the eos token id 
    if tokenizer.eos_token_id is not None:

        # We then use the eos token as pad token. 
        print(f"Tokenizer pad_token_id not set. Using eos_token_id ({tokenizer.eos_token_id}) as pad_token_id.")
        
        tokenizer.pad_token = tokenizer.eos_token

    else:

        # This is a more critical situation. Many models require a pad_token_id.
        # For Qwen models, <|endoftext|> is often a good candidate if nothing else is set.
        # ID for <|endoftext|> is often 151643 for Qwen models.
        # However, forcing a pad_token_id without knowing the model can be risky.
        print("Warning: tokenizer.pad_token_id and tokenizer.eos_token_id are not set. Generation might fail if padding is needed.")
        
        # As a last resort for some models, we might try:
        # tokenizer.add_special_tokens({'pad_token': '[PAD]'})
        # model.resize_token_embeddings(len(tokenizer))
        # model.config.pad_token_id = tokenizer.pad_token_id
        # But this is model-dependent. For now, we'll proceed and see if generate needs it.

# Ensure model config reflects the tokenizer's pad_token_id if set.
# This is usually handled, but being explicit can help.
if tokenizer.pad_token_id is not None:
    model.config.pad_token_id = tokenizer.pad_token_id
if tokenizer.eos_token_id is not None:
    model.config.eos_token_id = tokenizer.eos_token_id

# Setup info displaying about tokenizer state
print("Model and tokenizer loaded successfully.")

# Displaying info about the pad_token 
if tokenizer.pad_token_id is not None:
    print(f"Using pad_token_id: {tokenizer.pad_token_id} ({tokenizer.decode(tokenizer.pad_token_id)})")
else:
    print("Warning: pad_token_id is None.")

# Displaying info about the EOS token 
if tokenizer.eos_token_id is not None:
    print(f"Using eos_token_id: {tokenizer.eos_token_id} ({tokenizer.decode(tokenizer.eos_token_id)})")
else:
    print("Warning: eos_token_id is None (this is unusual for generative models).")

# Loading prompts from the assets folder
print("Loading prompts from the assets folder...")

# --- Load prompts from the JSON file ---
try:

    # Open the file in read and load it as a json 
    with open(CHUNK_PROMPT_FILE_PATH, 'r', encoding='utf-8') as f:
        chunk_prompts = json.load(f)

except FileNotFoundError:

    # Print the exception and exit 
    print(f"Error: Prompt file '{CHUNK_PROMPT_FILE_PATH}' not found.")
    exit()

# Do the same for the simplify prompts
try:

    # As above, we open the file in read and load it as a json 
    with open(SIMPLIFY_PROMPT_FILE_PATH, 'r', encoding='utf-8') as f:
        simplify_prompts = json.load(f)
except FileNotFoundError:

    # Error handling as above 
    print(f"Error: Prompt file '{SIMPLIFY_PROMPT_FILE_PATH}' not found.")
    exit()

print("Prompts loaded successfully.")

# --- 2. Helper Function for LLM Generation ---
# Afte the generic model configuration loading, we are now ready to define our core function. 
# generate_text_from_llm is the core behind chunk and simplify, and given a certain system/user prompt carefully
# built in the simplify/chunk function it will produce an output based on those. 
# Note that, we are using QWEN in a conversational way to maximize the output instead of a simple causal text generation model.
def generate_text_from_llm(system_prompt, user_prompt, max_new_tokens=32768):
    
    # Construct the message list in the format expected by the chat template.
    # This typically includes a system message to set the context/persona and a user message with the actual query.
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    # Apply the tokenizer's chat template to format the messages into a single string.
    # tokenize=False: Returns the raw string, not token IDs.
    # add_generation_prompt=True: Adds a special token/sequence to indicate the model should start generating.
    # enable_thinking=True: (Specific to some Qwen models) enables Chain of Tought "thinking" process for the model.
    prompt_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True, 
        enable_thinking=True
    )
    
    # Tokenize the formatted prompt text and convert it into PyTorch tensors.
    # return_tensors="pt": Ensures the output is PyTorch tensors.
    # .to(model.device): Moves the input tensors to the same device as the model (e.g., 'cuda' or 'cpu').
    inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)
    
    # Extract the attention mask from the inputs if it exists.
    # The attention mask tells the model which tokens are actual input and which are padding,
    # preventing attention to padding tokens.
    attention_mask = inputs.attention_mask if 'attention_mask' in inputs else None

    # Define terminators robustly
    terminators_ids = []
    if tokenizer.eos_token_id is not None:
        terminators_ids.append(tokenizer.eos_token_id)

    # Qwen models often use <|im_end|> or <|eot_id|> as part of their chat protocol.
    # Check for <|eot_id|> which we are using.
    # For Qwen2-Instruct, <|endoftext|> is the EOS, and <|im_start|> / <|im_end|> are for chat.
    # <|eot_id|> seems to be from older Qwen or specific fine-tunes.
    # For Qwen/Qwen2-7B-Instruct, "<|eot_id|>" is NOT a special token by default,
    # tokenizer.convert_tokens_to_ids("<|eot_id|>") would yield unk_token_id.
    # Let's use the more common <|im_end|> if using a Qwen chat model.
    # Or, if you are sure "<|eot_id|>" is correct for your *specific* Qwen3-8B, keep it.
    
    # Example for Qwen Chat models that use <|im_end|>
    im_end_token_id = tokenizer.convert_tokens_to_ids("<|im_end|>")
    if isinstance(im_end_token_id, int) and im_end_token_id not in terminators_ids:

         # Check if it's not the unknown token ID, or if unknown is fine.
         # Some tokenizers return unk_token_id if the token is not special but in vocab.
         # Others return it only if truly unknown.
        if im_end_token_id != tokenizer.unk_token_id: 

            # Only add if it's a specific known token
            terminators_ids.append(im_end_token_id)
    
    # Your original attempt with <|eot_id|>
    eot_id_token = tokenizer.convert_tokens_to_ids("<|eot_id|>")
    if isinstance(eot_id_token, int) and eot_id_token not in terminators_ids:

        # Ensure that the converted ID is not the tokenizer's unknown token ID,
        # which would indicate that "<|eot_id|>" is not a recognized token in the vocabulary.
        if eot_id_token != tokenizer.unk_token_id:
            print(f"Adding <|eot_id|> ({eot_id_token}) to terminators.")
            terminators_ids.append(eot_id_token)

    # Ensure terminators_ids is not empty if possible, otherwise model might not stop correctly.
    # If it's empty, generation will only stop at max_new_tokens.
    if not terminators_ids:

        print("Warning: No specific terminator IDs found. Generation will rely on max_new_tokens.")
        # Pass None to eos_token_id to let the model use its default config (if any).
        # An empty list might also work for some versions of transformers.
        effective_eos_token_id = None
    
    elif len(terminators_ids) == 1:
        
        # Pass single int if only one
        effective_eos_token_id = terminators_ids[0] 
    else:
    
        # Pass list if multiple
        effective_eos_token_id = terminators_ids 

    # Determine pad_token_id for generate call
    # It's best if model.config.pad_token_id is set correctly during init.
    # Explicitly passing it to generate overrides model.config.
    # If tokenizer.pad_token_id is None now, and model requires it, it could error.
    # Rely on what's set in model.config, which we tried to set earlier.
    current_pad_token_id = model.config.pad_token_id
    if current_pad_token_id is None:
        print("Warning: model.config.pad_token_id is None. If model needs padding for generation, this might be an issue.")


    print(f"\n--- Generating response with {len(inputs.input_ids[0])} input tokens (Max Tokens Allowed: {max_new_tokens})---")
    print(f"Using eos_token_id: {effective_eos_token_id}, pad_token_id: {current_pad_token_id}")

    # With torch.no_grad to avoid computing gradients (and potential compute time waste)
    with torch.no_grad():

        # We call the generate function from the model. 
        # We pass in input the attention mask, the max tokens to generate the eos/pad tokens 
        # and the standard value in term of temperate (model creativity) and top-p filtering value
        # for tokens selection.
        outputs = model.generate(
            inputs.input_ids,
            attention_mask=attention_mask,
            max_new_tokens=max_new_tokens,
            eos_token_id=effective_eos_token_id,
            do_sample=True,
            temperature=0.6,
            top_p=0.9,
            pad_token_id=current_pad_token_id # Use the ID from model.config (ideally set from tokenizer)
        )

    # Extract only the newly generated tokens from the model's output.
    # outputs[0] contains the full sequence (input + generated).
    # inputs.input_ids.shape[-1] gives the length of the input prompt.
    # Slicing from this index effectively removes the input tokens, leaving only the response.
    response_ids = outputs[0][inputs.input_ids.shape[-1]:]
    
    # We decode the answer 
    response_text = tokenizer.decode(response_ids, skip_special_tokens=True)
    
    # We return the function stripped of any whitespaces.
    return response_text.strip()

# --- 3. Task-Specific Functions (chunk_article, simplify_chunk) ---

# Function that given a chunk of text, will try to split it in different, digestible smaller pieces. 
# Given the target language, we'll instruct the LLM to do the translation.
def chunk(article_text_input, lang="en"):

    # Activation call
    print(f"\n--- Calling LLM for Chunking (Language: {lang.upper()}) ---")
    
    # We extract the language from which we'll load the specific prompt from the file, given the language map.
    language_name = LANGUAGE_MAP.get(lang.lower())

    # Loading the specific system/user prompt from the json file 
    chunking_system_prompt = chunk_prompts[lang.lower()].get("system_prompt", "")
    chunking_user_prompt = chunk_prompts[lang.lower()].get("user_prompt", "")

    # Replace placeholders in the user prompt with the one passed in input 
    chunking_user_prompt = chunking_user_prompt.format(article_text_input=article_text_input, language_name=language_name)
    
    # LLM call to process the text 
    try:

        # Raw output containing the answer from the LLM. This include the CoT blocks.
        raw_llm_output = generate_text_from_llm(chunking_system_prompt, chunking_user_prompt, max_new_tokens=4096)
        print("\n--- Raw Chunked Text from LLM: DONE ---")
        

        # --- More Targeted Python Cleanup based on the model output ---
        cleaned_output = raw_llm_output

        # 1. Remove <think> block if present
        think_pattern = re.compile(r"<think>.*?</think>\s*\n*", re.DOTALL | re.IGNORECASE)
        cleaned_output = think_pattern.sub("", cleaned_output).strip()
        
        # 2. Remove "**Chunk X:**" labels if present (and any leading/trailing whitespace around them)
        # This regex looks for "**Chunk" followed by digits, then ":**" and optional whitespace.
        chunk_label_pattern = re.compile(r"^\s*\*\*Chunk\s*\d+:\*\*\s*\n?", re.MULTILINE | re.IGNORECASE)
        cleaned_output = chunk_label_pattern.sub("", cleaned_output).strip()
        
        # 3. Sometimes, after removing labels, there might be extra empty lines at the start.
        # Let's also strip leading/trailing whitespace from the whole block again.
        cleaned_output = cleaned_output.strip()

        # If cleaning resulted in an empty string
        if not cleaned_output: 

            # Print the info in the console and return the sample input article 
            print("Warning: LLM output became empty after cleanup. Using the whole text as one chunk.")
            return [article_text_input.strip()]

        # Now parse the cleaned output using a simple list cohmprension split 
        parsed_chunks = [chunk.strip() for chunk in cleaned_output.split('\n\n') if chunk.strip()]

        # As above, if the cleaning strip resulted in an empty string 
        if not parsed_chunks:

            # Print the info in the console and return the sample input article 
            print("Warning: Could not parse chunks from LLM output after cleanup. Using the whole text as one chunk for safety.")
            return [article_text_input.strip()]
        
        # VISUAL INFO: PRINT CHUNKED ARTICLES (NOT NEEDED IF NOT EXPLICITED)
        """
        print("--- Cleaned and Parsed Chunks ---")
        for i, p_chunk in enumerate(parsed_chunks):
            print(f"Chunk {i+1}: {p_chunk}")
        """

        # After the chunk is sanitized, we can split it even further into two different lists: 
        # One with the plain text and one with the highlighted text. 
        # We still need to try this because we don't know if the LLM will always output the text in the correct format. 
        # If the try fails, we will return the original chunk as a fallback.
        # We use the newlines to split the text into two lists.    
        try:

            # Sometimes, the LLM returns chunks in this format: ["chunk1_not_highlighted\nChunk1_highlighted", "chunk2..."]
            # So we need to parse, if possible, this potential output. 
            plain_text_chunks = [chunk.split('\n')[0] for chunk in parsed_chunks]
            highlighted_text_chunks = [chunk.split('\n')[1] for chunk in parsed_chunks]

        except Exception as e:
            
            # If an exception occur, the format we were trying to split wasn't correct and we just return 
            # the parsed chunks three times instead.
            print(f"Error during chunk splitting: {e}")
            return parsed_chunks, parsed_chunks, parsed_chunks

        # After this, we return the sanitized, splitted output of the LLM.
        return parsed_chunks, plain_text_chunks, highlighted_text_chunks

    except Exception as e:

        # If something happens during those phases, print the error and return the sample article 
        print(f"Error during chunking LLM call: {e}")
        return [f"[Error during chunking: {e}]", article_text_input.strip()]

# Function that, given a text chunk, will simplify it removing paraphrases, metaphors, difficult terms etc.
# We do this in the required language, as above.
def simplify_chunk(text_chunk, lang="en"):

    # Activation call
    print(f"\n--- Calling LLM for Simplifying Chunk (Language: {lang.upper()}): '{text_chunk[:50]}...' ---")
    
    # As above, by the language passed in input, we fetch the right element from the language map 
    language_name = LANGUAGE_MAP.get(lang.lower())

    # And then we extract the right system/user prompt in the desired language from the json 
    simplification_system_prompt = simplify_prompts[lang.lower()].get("system_prompt", "")
    simplification_user_prompt = simplify_prompts[lang.lower()].get("user_prompt", "")

    # Replace placeholders in the user prompt
    simplification_user_prompt = simplification_user_prompt.format(text_chunk=text_chunk, language_name=language_name)  

    # Call the LLM
    try:

        # Raw output containing the answer from the LLM. This include the CoT blocks.
        raw_llm_output = generate_text_from_llm(simplification_system_prompt, simplification_user_prompt, max_new_tokens=4096)

        # Coping the output into the final output string 
        simplified_text = raw_llm_output

        # Remove the <think> block if present
        think_pattern = re.compile(r"<think>.*?</think>\s*\n*", re.DOTALL | re.IGNORECASE)
        simplified_text = think_pattern.sub("", simplified_text).strip()

        # Further attempt to clean common unwanted prefixes if the model still adds them
        common_prefixes_to_remove = [
            "Here is the rewritten text chunk:",
            "Rewritten Text Chunk:",
            "Simplified Chunk:",
            "Here's the rewritten text chunk:"
        ]

        # For each element of the above list, we iterate through each of them 
        for prefix in common_prefixes_to_remove:

            # We control if the string starts with one of them 
            if simplified_text.lower().startswith(prefix.lower()):

                # If so, we strip the string from that prefix and break, 
                # Removing only the first matching prefix
                simplified_text = simplified_text[len(prefix):].lstrip()
                break

        # After the string has been sanitized, we return it 
        return simplified_text
    
    except Exception as e:
    
        # If something happens during those phases, print the error and return the sample article 
        print(f"Error during chunking LLM call: {e}")
        print(f"Error during simplification LLM call: {e}")
        return f"[Error simplifying chunk: {text_chunk[:50]}... - {e}]"

# --- 4. Text Simplification Orchestrator (New) ---
# Function that Chunks an article and then simplifies each chunk.
def simplify(article_text_input, lang="en"):
    
    # --- Stage 1: Chunk the article ---
    print("\n--- Attempting to Chunk Article ---")
    
    # We call the chunk_article function. It should returns three elements: 
    # - parsed_chunks (which contain everything, highlighted and non text)
    # - plain_text_chunks (text with plain text, no highlighting and markdown)
    # - highlighted_text_chunks (text with highlight content and markdown)
    # We only need the parsed chunks because more context (highlighted and not) means more stability 
    # in the semplification.
    parsed_chunks, _, _ = chunk(article_text_input, lang=lang)

    # If the parsed chunks are empty 
    if not parsed_chunks:

        # We log it and return an empty list 
        print("Critical Error: chunk_article returned no data (e.g., None or empty list).")
        return [] 

    # If chunk_article returns an error, it will be a list like:
    # ["[Error during chunking: ...]", "original_text_fallback"]
    # We'll use that list for stronger checks.
    is_chunking_error = isinstance(parsed_chunks[0], str) and parsed_chunks[0].startswith("[Error during chunking:")

    # If a chunking error occurred 
    if is_chunking_error:

        # Print the error 
        print(f"Chunking Error: {parsed_chunks[0]}")

        # This checks if the parsed_chunks list contains more than one element. When chunk_article encounters an error, 
        # it's designed to return a list where the first element is an error message (e.g., "[Error during chunking: ...]") 
        # and the second element might be the original input text as a fallback.
        if len(parsed_chunks) > 1 and isinstance(parsed_chunks[1], str): 
            print(f"Original text (fallback, if provided by error handler): '{parsed_chunks[1][:100]}...'")
        
        # If a chunking error occurred, return the parsed_chunks directly.
        # This list will contain the error message and potentially the original text as a fallback,
        # indicating that the simplification process cannot proceed normally.
        return parsed_chunks 

    # Console INFO about how many chunks have been processed 
    print(f"\nArticle processed into {len(parsed_chunks)} chunk(s):")

    # Info about the state of the chunking, it may not directly split into various chunks and returns as one
    if len(parsed_chunks) == 1 and parsed_chunks[0] == article_text_input.strip() and not is_chunking_error:
        print("(Note: Article may not have been split by the LLM; was processed as a single chunk)")

    # VISUAL PURPOSE: Iterate through the parsed chunks and print each one for verification.
    """
    for i, chunk_text_iter in enumerate(parsed_chunks):
        print(f"Chunk {i+1}: {chunk_text_iter}")
    """
        
    # --- Stage 2: Simplify each chunk ---
    print("\n--- Attempting to Simplify Chunks ---")
    
    # Initially, the simplified chunk list is empty (no chunks simplified)
    simplified_chunks_list = []

    # For each parsed chunk
    for i, chunk_text_iter in enumerate(parsed_chunks): 
        
        # VISUAL INFO: Print the preview of the chunk to be simplified 
        """
        preview_text = chunk_text_iter
        print(f"Simplifying Chunk {i+1}/{len(parsed_chunks)} (starts with: '{preview_text}...')")
        """

        # Print the number of chunks currently in simplification out of all the chunks 
        print(f"Simplifying chunk {i} of {len(parsed_chunks)}.")

        # We pass the chunked text block to the simplify function alongside the desired lang
        simplified_chunk_text = simplify_chunk(chunk_text_iter, lang=lang)

        # After the inference, we append it to the list 
        simplified_chunks_list.append(simplified_chunk_text)

        # We print the result
        print(f"Chunk {i} Simplified: OK")

    # We return the simplified list
    return simplified_chunks_list