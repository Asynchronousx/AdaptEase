// Import icons from icons.js (ensure icons.js is in the same directory or adjust path)
// This line imports various SVG icon strings from a separate JavaScript file.
// These icons are used throughout the widget for buttons, logos, and UI elements.
import {

    // Icon for the "Text in Blocks" feature.
    ICON_TEXT_IN_BLOCKS,
    // Icon for the "Simplified Text" feature.
    ICON_SIMPLIFIED_TEXT,
    // Icon for the "Readable Font" feature.
    ICON_READABLE_FONT,
    // Icon for the "Soft Colors" feature.
    ICON_SOFT_COLORS,
    // AdaptEase logo specifically for the footer section of the widget.
    ICON_FOOTER_LOGO,      
    // AdaptEase logo used for the Floating Action Button (FAB) when the widget menu is closed.
    ICON_WIDGET_OPEN,     
    // 'X' icon used for the Floating Action Button (FAB) when the widget menu is open, indicating it can be closed.
    ICON_WIDGET_CLOSE     

} from './icons.js';

// NEW: Function to load Lottie Player script
// This function dynamically loads the Lottie Player component script from unpkg.com.
// It returns a Promise, allowing asynchronous loading and ensuring the component is available before use.
function loadLottiePlayer() {

    // Returns a new Promise that resolves when the script is loaded or rejects on error.
    return new Promise((resolve, reject) => {
    
        // Checks if the 'dotlottie-player' custom element is already defined.
        // If it is, the script has already been loaded, so resolve immediately.
        if (customElements.get('dotlottie-player')) {
    
            // Resolve the promise as the player is already available.
            resolve(); // Already loaded
            // Exit the function.
            return;
    
        }
    
        // Creates a new script element.
        const script = document.createElement('script');
    
        // Sets the script type to 'module' for ES module compatibility.
        script.type = 'module';
    
        // Sets the source URL for the Lottie player component.
        script.src = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
    
        // Defines the onload event handler for the script.
        // This function is called when the script has successfully loaded.
        script.onload = () => {
    
            // Logs a message to the console indicating successful loading.
            console.log('AdaptEase: Lottie player script loaded.');
    
            // Resolves the promise.
            resolve();
    
        };
    
        // Defines the onerror event handler for the script.
        // This function is called if there's an error loading the script.
        script.onerror = (e) => {
    
            // Logs an error message to the console.
            console.error('AdaptEase: Failed to load Lottie player script.', e);
    
            // Rejects the promise with an error.
            reject(new Error('Failed to load Lottie player script.'));
    
        };
    
        // Appends the script element to the document's head, initiating the load.
        document.head.appendChild(script);
    
    });
}

// --- Global variable to store original HTML content of all target elements ---
// This map will be populated once in setupWidgetLogic.
// This Map stores the original innerHTML of elements targeted for text modifications.
// It's crucial for reverting changes and ensuring features operate on the initial content.
const originalElementHTML = new Map();

// This is an Immediately Invoked Function Expression (IIFE).
// It creates a private scope for the widget's code, preventing global variable pollution.
(function() {
 
    // --- Configuration ---
    // Defines the widget's configuration, including paths, fonts, and API settings.
    // It's an IIFE itself to ensure configuration is set up immediately upon script execution.
    const WIDGET_CONFIG = (function() {
 
        // Defines default configuration values for the widget.
        const defaults = {
 
            // Path to the HTML file that defines the widget's structure.
            htmlPath: './adaptease.html',      // Your HTML file name for the widget structure
 
            // Path to the CSS file for styling the widget.
            cssPath: './adaptease.css',        // Your CSS file name
 
            // Path to the JSON file containing translations for different languages.
            translationsPath: './assets/adaptease_translations.json', // Path to the translations file
 
            // Flag to determine if the Lexend font should be considered for loading/use.
            loadLexendFont: true,
 
            // URL for the Lexend font from Google Fonts (though direct loading is now removed).
            lexendFontUrl: 'https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap',
 
            // Default language for the widget if not specified or found.
            defaultLanguage: 'it',
 
            // Default CSS class name used to identify text elements that the widget should modify.
            // This can be overridden by a data-attribute on the script tag.
            textClassName: '.PlaceHolderTextClass', // Standard class for text containers, overridden by the data-attribute in the script tag.
 
            // New: Base URL for the Python API backend that provides text processing services.
            pythonApiBaseUrl: 'http://127.0.0.1:5000/api', // New: Base URL for your Python API

            // NEW: Configuration for OpenDyslexic font
            // Flag to determine if the OpenDyslexic font should be loaded.
            loadOpenDyslexicFont: true, // Set to true to load OpenDyslexic
 
            // Configuration details for loading OpenDyslexic font.
            openDyslexicFontConfig: {
 
                // The CSS font-family name to be used for OpenDyslexic.
                fontFamilyName: 'OpenDyslexic', // The name to use in CSS
 
                // Base path to the directory containing OpenDyslexic font files.
                basePath: './assets/fonts/opendyslexic/',           // Path to your asset folder
 
                // Array defining individual font files (e.g., regular, bold, italic) with their properties.
                files: [                        // Define font files
 
                    // Regular OpenDyslexic font file.
                    { name: 'OpenDyslexic-Regular.otf', weight: 'normal', style: 'normal' },
 
                    // Bold OpenDyslexic font file.
                    { name: 'OpenDyslexic-Bold.otf', weight: 'bold', style: 'normal' },
 
                    // Italic OpenDyslexic font file.
                    { name: 'OpenDyslexic-Italic.otf', weight: 'normal', style: 'italic' },
 
                    // Bold Italic OpenDyslexic font file.
                    { name: 'OpenDyslexic-BoldItalic.otf', weight: 'bold', style: 'italic' }
 
                ]
            }
        };

        // Start with a deep copy of defaults to avoid modifying them, especially nested objects
        // Creates a deep copy of the default configuration to ensure that modifications
        // don't affect the original `defaults` object.
        let finalConfig = JSON.parse(JSON.stringify(defaults));

        // Find the script tag for adaptease.js
        // document.currentScript is null for type="module" or deferred scripts during initial execution.
        // Querying by src is more reliable.
        // Attempts to find the script tag that loaded this `adaptease.js` file.
        // This is done to read data-attributes for custom configuration.
        const scriptTag = document.querySelector('script[src$="adaptease.js"]'); // Assumes src ends with "adaptease.js"

        // Checks if the script tag was found.
        if (scriptTag) {
 
            // Logs a message indicating that the script tag was found.
            console.log("AdaptEase: Script tag found. Reading data-attributes for configuration.");

            // Retrieves the value of the 'data-adaptease-text-class' attribute from the script tag.
            const userTextClassName = scriptTag.getAttribute('data-adaptease-text-class');
 
            // If a custom text class name is provided via the data-attribute, it overrides the default.
            if (userTextClassName) {
 
                // Overrides the default `textClassName` with the user-provided value.
                finalConfig.textClassName = userTextClassName; // <<<< HERE: Overridden by data-attribute
 
                // Logs the custom text class name being used.
                console.log(`AdaptEase: Using custom textClassName: "${userTextClassName}"`);
 
            }
        }
 
        // Returns the final configuration object.
        return finalConfig;
 
    })(); // Immediately invoke to set WIDGET_CONFIG

    // --- Helper to fetch content ---
    // Asynchronous function to fetch resources (HTML, CSS, JSON) from a given URL.
    // It handles network responses and parses content based on the specified type.
    async function fetchResource(url, type = 'text') {
 
        // Fetches the resource from the provided URL.
        const response = await fetch(url);
 
        // Checks if the network response was successful (status code 200-299).
        if (!response.ok) {
 
            // Throws an error if the fetch operation failed.
            throw new Error(`Failed to fetch ${url}: ${response.statusText} (Status: ${response.status})`);
 
        }
 
        // If the type is 'json', parses the response body as JSON.
        if (type === 'json') {
            return response.json();
        }
 
        // Otherwise, parses the response body as plain text.
        return response.text();
 
    }

    // --- Function to set up all the widget's JS logic ---
    // This is the main function that initializes all the interactive logic of the AdaptEase widget.
    // It takes translations data as an argument to populate UI text.
    function setupWidgetLogic(translationsData) {
 
        // Populate originalElementHTML if it's empty (i.e., first run for this page load)
        // This ensures we capture the state before any modifications.
        // If the `originalElementHTML` map is empty, it means this is the first time
        // `setupWidgetLogic` is run for the current page load.
        // It iterates over all elements matching `WIDGET_CONFIG.textClassName`
        // and stores their initial `innerHTML` in the `originalElementHTML` map.
        // This is crucial for reverting text modifications.
        if (originalElementHTML.size === 0) {
 
            // Selects all elements on the page that match the configured text class name.
            document.querySelectorAll(WIDGET_CONFIG.textClassName).forEach(element => {
 
                // Stores the original innerHTML of each element in the map, keyed by the element itself.
                originalElementHTML.set(element, element.innerHTML);
 
            });
        }

        // Gets a reference to the floating widget button (the FAB).
        const floatingWidgetBtn = document.getElementById('floatingCloseWidget');
 
        // Gets a reference to the main widget menu container.
        const adaptEaseMenu = document.getElementById('adaptEaseWidgetMenu');

        // NEW: Get references to loading overlay elements
        // Gets a reference to the loading overlay element.
 
        const loadingOverlayElement = document.getElementById('adapteaseLoadingOverlay');
        // const lottiePlayerElement = document.getElementById('adapteaseLottieAnimation'); // autoplay is on

        // NEW: Functions to show/hide loading animation
        // Function to display the loading animation overlay.
        function showLoadingAnimation() {
 
            // Checks if the loading overlay element exists.
            if (loadingOverlayElement) {
 
                // Sets the display style to 'flex' to make the overlay visible.
                loadingOverlayElement.style.display = 'flex';
 
                // If autoplay on dotlottie-player is not reliable, it might be needed:
                // if (lottiePlayerElement && typeof lottiePlayerElement.play === 'function') {
                //     lottiePlayerElement.play();
                // }
 
            }
        }

        // Function to hide the loading animation overlay.
        function hideLoadingAnimation() {
            
            // Checks if the loading overlay element exists.
            if (loadingOverlayElement) {
                
                // Sets the display style to 'none' to hide the overlay.
                loadingOverlayElement.style.display = 'none';
                
                // If autoplay on dotlottie-player is not reliable, it might be needed:
                // if (lottiePlayerElement && typeof lottiePlayerElement.stop === 'function') {
                //     lottiePlayerElement.stop();
                // }
            
            }
        }

        // Gets a reference to the button that displays the current language.
        const currentLanguageButton = document.getElementById('currentLanguageButton');
        
        // Gets a reference to the icon displaying the current language's flag.
        const currentFlagIcon = document.getElementById('currentFlagIcon');
        
        // Gets a reference to the text displaying the current language's name.
        const currentLanguageText = document.getElementById('currentLanguageText');
        
        // Gets a reference to the dropdown menu for language selection.
        const languageDropdown = document.getElementById('languageDropdown');
        
        // Selects all elements that represent language options within the dropdown.
        const langOptions = document.querySelectorAll('.awm-v2-language-option');

        // Gets references to the text labels for each accessibility feature button.
        const labelTextInBlocksElement = document.getElementById('labelTextInBlocks');
        const labelSimplifiedTextElement = document.getElementById('labelSimplifiedText');
        const labelReadableFontElement = document.getElementById('labelReadableFont');
        const labelSoftColorsElement = document.getElementById('labelSoftColors');

        // Gets references to the hover text labels for each accessibility feature button.
        const labelTextInBlocksHoverElement = document.getElementById('labelTextInBlocksHover');
        const labelSimplifiedTextHoverElement = document.getElementById('labelSimplifiedTextHover');
        const labelReadableFontHoverElement = document.getElementById('labelReadableFontHover');
        const labelSoftColorsHoverElement = document.getElementById('labelSoftColorsHover');

        // Gets a reference to the header title element within the widget.
        const headerTitleElement = document.getElementById('headerTitle');
        
        // Gets a reference to the footer text element within the widget.
        const footerTextElement = document.getElementById('footerText');

        // Gets references to the actual accessibility feature buttons.
        const buttonTextInBlocks = document.getElementById('buttonTextInBlocks');
        const buttonSimplifiedText = document.getElementById('buttonSimplifiedText');
        const buttonReadableFont = document.getElementById('buttonReadableFont');
        const buttonSoftColors = document.getElementById('buttonSoftColors');

        // Gets references to the containers where feature icons will be injected.
        const iconTextInBlocksContainer = document.getElementById('iconTextInBlocksContainer');
        const iconSimplifiedTextContainer = document.getElementById('iconSimplifiedTextContainer');
        const iconReadableFontContainer = document.getElementById('iconReadableFontContainer');
        const iconSoftColorsContainer = document.getElementById('iconSoftColorsContainer');

        // Inject accessibility button SVGs
        // Injects the SVG icon for "Text in Blocks" into its container if the container exists.
        if (iconTextInBlocksContainer) iconTextInBlocksContainer.innerHTML = ICON_TEXT_IN_BLOCKS;
        
        // Injects the SVG icon for "Simplified Text" into its container if the container exists.
        if (iconSimplifiedTextContainer) iconSimplifiedTextContainer.innerHTML = ICON_SIMPLIFIED_TEXT;
        
        // Injects the SVG icon for "Readable Font" into its container if the container exists.
        if (iconReadableFontContainer) iconReadableFontContainer.innerHTML = ICON_READABLE_FONT;
        
        // Injects the SVG icon for "Soft Colors" into its container if the container exists.
        if (iconSoftColorsContainer) iconSoftColorsContainer.innerHTML = ICON_SOFT_COLORS;

        // Set initial state for the floating widget button icon
        // Sets the initial icon for the floating widget button to the "open" icon (AdaptEase logo).
        if (floatingWidgetBtn) {
        
            // Default: show open icon (AdaptEase logo)
            floatingWidgetBtn.innerHTML = ICON_WIDGET_OPEN; 
        }

        // Assigns the loaded translations data to a local variable.
        const translations = translationsData;
        
        // Initializes the current language based on the widget configuration's default language.
        let currentLanguage = WIDGET_CONFIG.defaultLanguage || 'it';
        
        // If the default language from config is not found in the translations data,
        // it falls back to the first available language in the translations.
        if (!translations[currentLanguage]) {
        
            // If the default language from config is not found in the translations data,
            // it falls back to the first available language in the translations.
            currentLanguage = Object.keys(translations)[0] || 'en';
        }

        // State variable to track if the "Readable Font" feature is active.
        let isReadableFontActive = false;

        // Map to store the original font-family styles of elements before "Readable Font" is applied.
        const originalElementFontFamilies = new Map();
        
        // State variable to track if the "Soft Colors" feature is active.
        let isSoftColorsActive = false;

        // NEW: Map to store active feature states per language
        // A Map to keep track of which features (Text in Blocks, Simplified Text) are active
        // for each language. This allows features to persist across language switches.
        const activeFeatures_perLang = new Map();
        
        // Global flag to indicate if an API call for a feature is currently in progress.
        // This prevents multiple simultaneous API calls for text processing.
        let isProcessingFeature = false; // Global flag for ongoing API processing
        
        // Stores details about the currently active API call (feature name and language).
        let activeApiCallDetails = null; // NEW: { name: 'featureName', lang: 'languageCode' }
        
        // Flag to indicate if a short, temporary loading animation is active (e.g., for cache hits).
        let isShortAnimationActive = false; // NEW: Flag for temporary cache animation

        // Applied maps as originalElementHTML will be the source of truth
        // const textBeforeBlocksApplied = new Map(); Will store original innerHTML
        // Map to cache the processed HTML for "Text in Blocks" feature, per language.
        // This avoids re-calling the API for content that has already been processed.
        const cachedChunkedHTML_perLang = new Map();

        // const textBeforeSimplifiedApplied = new Map(); Will store original innerHTML
        // Map to cache the processed HTML for "Simplified Text" feature, per language.
        // Similar to `cachedChunkedHTML_perLang`, it prevents redundant API calls.
        const cachedSimplifiedText_perLang = new Map();

        // Log the textClassName being used
        // Logs the CSS selector being used to identify target text elements.
        console.log(`AdaptEase: Applying modifications to elements matching selector: "${WIDGET_CONFIG.textClassName}"`);

        // Selects all elements that match the configured text class name.
        const targetTextElements = document.querySelectorAll(WIDGET_CONFIG.textClassName);
        
        // Checks if any target text elements were found.
        if (targetTextElements.length === 0) {
        
            // Warns if no elements are found, as features might not apply.
            console.warn(`AdaptEase: No elements found with selector "${WIDGET_CONFIG.textClassName}". AdaptEase features might not apply to any text.`);
            
        
        } else {
            
            // Logs the number of elements found for text modifications.
            console.log(`AdaptEase: Found ${targetTextElements.length} elements for text modifications.`);
        }

        // --- Helper function to refresh only the content elements based on active features ---
        // This function updates the content of target text elements based on the active features
        // for the given language. It prioritizes cached content if available.
        function refreshContentElements(lang) {
            
            // Re-selects target text elements to ensure the most current DOM state.
            const targetTextElements = document.querySelectorAll(WIDGET_CONFIG.textClassName);
            
            // Retrieves the active feature states for the specified language.
            const currentLangFeatureStates = activeFeatures_perLang.get(lang) || { textInBlocks: false, simplifiedText: false };

            // Iterates over each target text element.
            targetTextElements.forEach(element => {
            
                // Checks if the element's original HTML content is stored.
                if (!originalElementHTML.has(element)) {
            
                    // Warns if original HTML is missing for an element.
                    console.warn("AdaptEase: Element not found in originalElementHTML map during refreshContentElements.", element);
            
                    // Skips to the next element.
                    return;
            
                }
            
                // Retrieves the original HTML content of the element.
                const originalContent = originalElementHTML.get(element);

                // If "Text in Blocks" is active for the current language.
                if (currentLangFeatureStates.textInBlocks) {
            
                    // Gets the cached chunked HTML for the current language.
                    const langCacheChunked = cachedChunkedHTML_perLang.get(lang);
            
                    // If cached content exists for this element, apply it.
                    if (langCacheChunked && langCacheChunked.has(element)) {
            
                        // Apply the cached chunked text to that text container
                        element.innerHTML = langCacheChunked.get(element);
            
                    } else {

                        // Feature active for lang, but no specific processed cache found (e.g. API error, or not processed yet).
                        // Revert to original.
                        // If no cached content, revert to original content.
                        element.innerHTML = originalContent;
                    
                    }

                } else if (currentLangFeatureStates.simplifiedText) {
                    
                    // If "Simplified Text" is active for the current language.
                    // Gets the cached simplified text for the current language.
                    const langCacheSimplified = cachedSimplifiedText_perLang.get(lang);
                    
                    // If cached content exists for this element, apply it.
                    if (langCacheSimplified && langCacheSimplified.has(element)) {
                    
                        // As above, apply the cached element 
                        element.innerHTML = langCacheSimplified.get(element);
                    
                    } else {
                    
                        // Feature active for lang, but no specific processed cache found.
                        // Revert to original.
                        // If no cached content, revert to original content.
                        element.innerHTML = originalContent;
                    
                    }
                } else {
                    
                    // Neither feature is active for this language. Revert to original HTML.
                    // If neither "Text in Blocks" nor "Simplified Text" is active, revert to original HTML.
                    element.innerHTML = originalContent;
                
                }
            });
        }

        // --- Helper Function to update feature button states ---
        // This function updates the visual state (active, disabled, processing) of the
        // feature buttons based on the current language's active features and global API processing status.
        function updateFeatureButtonStates(lang) {
            
            // Retrieves the active feature states for the specified language.
            const currentLangFeatures = activeFeatures_perLang.get(lang) || { textInBlocks: false, simplifiedText: false };

            // Set base 'active' class
            // Toggles the 'active' class on the "Text in Blocks" button based on its state.
            
            if (buttonTextInBlocks) buttonTextInBlocks.classList.toggle('active', currentLangFeatures.textInBlocks);
            
            // Toggles the 'active' class on the "Simplified Text" button based on its state.
            if (buttonSimplifiedText) buttonSimplifiedText.classList.toggle('active', currentLangFeatures.simplifiedText);

            // Reset states before applying new ones
            // Resets the "Text in Blocks" button to its default enabled state, removing processing/unavailable classes.
            if (buttonTextInBlocks) {
                buttonTextInBlocks.disabled = false;
                buttonTextInBlocks.classList.remove('adaptease-button-unavailable', 'adaptease-button-processing');
            }
            
            // Resets the "Simplified Text" button to its default enabled state, removing processing/unavailable classes.
            if (buttonSimplifiedText) {
                buttonSimplifiedText.disabled = false;
                buttonSimplifiedText.classList.remove('adaptease-button-unavailable', 'adaptease-button-processing');
            }

            // --- Animation visibility based on global processing state and current language ---
            // Only manage animation if a short animation is NOT active.
            // If a short animation IS active, it will manage its own hiding via setTimeout.
            // Manages the visibility of the loading animation.
            // It only acts if a short, temporary animation (for cache hits) is not already active.
            if (!isShortAnimationActive) {
            
                // If an API call is in progress and it's for the current language, show the animation.
                if (isProcessingFeature && activeApiCallDetails && activeApiCallDetails.lang === lang) {
                    showLoadingAnimation();
                } else {
                    // Otherwise, hide the animation.
                    hideLoadingAnimation();
                }
            }
            // --- End Animation visibility ---

            // If an API call is currently active.
            if (isProcessingFeature && activeApiCallDetails) {
            
                // An API call is active
                // If the active API call is for the currently displayed language.
                if (activeApiCallDetails.lang === lang) {
            
                    // The active API call is for THIS language
                    // If the active API call is for "Text in Blocks".
                    if (activeApiCallDetails.name === 'textInBlocks') {
            
                        // Add 'processing' class to "Text in Blocks" button.
                        if (buttonTextInBlocks) {
                            buttonTextInBlocks.classList.add('adaptease-button-processing');
                        }
            
                        // Disable and mark "Simplified Text" button as unavailable.
                        if (buttonSimplifiedText) {
                            buttonSimplifiedText.disabled = true;
                            buttonSimplifiedText.classList.add('adaptease-button-unavailable');
                        }
            
                    } else if (activeApiCallDetails.name === 'simplifiedText') {
            
                        // If the active API call is for "Simplified Text".
                        // Add 'processing' class to "Simplified Text" button.
                        if (buttonSimplifiedText) {
                            buttonSimplifiedText.classList.add('adaptease-button-processing');
                        }
            
                        // Disable and mark "Text in Blocks" button as unavailable.
                        if (buttonTextInBlocks) {
                            buttonTextInBlocks.disabled = true;
                            buttonTextInBlocks.classList.add('adaptease-button-unavailable');
                        }
            
                    }
            
                } else {
            
                    // The active API call is for a DIFFERENT language.
                    // For THIS language (lang), enable buttons if their action is cache-only or if they are already active.
                    // If an API call is active for a *different* language,
                    // buttons for the *current* language might be disabled unless their action
                    // can be fulfilled from cache or they are already active (for deactivation).
                    if (buttonTextInBlocks) {
            
                        // Get cache for "Text in Blocks" for the current language.
                        const langCacheChunked = cachedChunkedHTML_perLang.get(lang);
            
                        // Determine if the button can operate from cache (either active or inactive but cache exists).
                        const canOperateFromCache = currentLangFeatures.textInBlocks || (!currentLangFeatures.textInBlocks && langCacheChunked && langCacheChunked.size > 0);
            
                        // If it cannot operate from cache, disable and mark as unavailable.
                        if (!canOperateFromCache) {
                            buttonTextInBlocks.disabled = true;
                            buttonTextInBlocks.classList.add('adaptease-button-unavailable');
                        }
            
                    }
                    if (buttonSimplifiedText) {
            
                        // Get cache for "Simplified Text" for the current language.
                        const langCacheSimplified = cachedSimplifiedText_perLang.get(lang);
            
                        // Determine if the button can operate from cache.
                        const canOperateFromCache = currentLangFeatures.simplifiedText || (!currentLangFeatures.simplifiedText && langCacheSimplified && langCacheSimplified.size > 0);
            
                        // If it cannot operate from cache, disable and mark as unavailable.
                        if (!canOperateFromCache) {
                            buttonSimplifiedText.disabled = true;
                            buttonSimplifiedText.classList.add('adaptease-button-unavailable');
                        }
            
                    }
                }
            } else {
            
                // No global API processing, or activeApiCallDetails is null. Standard mutual exclusivity for THIS language.
                // If no API call is in progress, apply standard mutual exclusivity rules for the current language.
                if (currentLangFeatures.textInBlocks) {
            
                    // If "Text in Blocks" is active, disable "Simplified Text".
                    if (buttonSimplifiedText) {
                        buttonSimplifiedText.disabled = true;
                        buttonSimplifiedText.classList.add('adaptease-button-unavailable');
                    }
            
                } else if (currentLangFeatures.simplifiedText) {
            
                    // If "Simplified Text" is active, disable "Text in Blocks".
                    if (buttonTextInBlocks) {
                        buttonTextInBlocks.disabled = true;
                        buttonTextInBlocks.classList.add('adaptease-button-unavailable');
                    }
            
                }
            
                // If neither is active, both are enabled by default from the reset above.
            
            }
        }

        // Function to update all UI text elements based on the selected language.
        function updateUIText(lang) {
            
            // Defines an array of essential UI elements that must exist for the function to proceed.
            const elementsToEnsure = [
                currentLanguageButton, languageDropdown, currentFlagIcon, currentLanguageText,
                headerTitleElement, labelTextInBlocksElement, labelSimplifiedTextElement,
                labelReadableFontElement, labelSoftColorsElement, labelTextInBlocksHoverElement,
                labelSimplifiedTextHoverElement, labelReadableFontHoverElement, labelSoftColorsHoverElement,
                footerTextElement, buttonTextInBlocks, buttonSimplifiedText // Ensure buttons are considered
            ];
            
            // If any of the essential elements are missing, exit the function.
            if (elementsToEnsure.some(el => !el)) {
                return;
            }

            // Closes the language dropdown and resets its state.
            currentLanguageButton.classList.remove('open');
            languageDropdown.style.display = 'none';
            currentLanguageButton.setAttribute('aria-expanded', 'false');

            // Update feature button states based on the new language and global processing state
            // Calls the helper function to update the visual state of feature buttons for the new language.
            updateFeatureButtonStates(lang);

            // NEW: Apply cached content based on active features for the new language
            // Replaced direct loop with call to new helper function
            // Refreshes the content of text elements based on the active features for the new language.
            refreshContentElements(lang);

            // Retrieves the translations for the specified language.
            const t = translations[lang];
            
            // If no translations are found for the language, exit the function.
            if (!t) {
                return;
            }

            // Updates the flag icon and language name text.
            currentFlagIcon.textContent = t.flag;
            currentLanguageText.textContent = t.langName;
            
            // Updates the header title.
            headerTitleElement.textContent = t.headerTitle;

            // Updates the labels for the accessibility feature buttons.
            labelTextInBlocksElement.textContent = t.labelTextInBlocks;
            labelSimplifiedTextElement.textContent = t.labelSimplifiedText;
            labelReadableFontElement.textContent = t.labelReadableFont;
            labelSoftColorsElement.textContent = t.labelSoftColors;

            // Updates the hover labels for the accessibility feature buttons.
            labelTextInBlocksHoverElement.textContent = t.labelTextInBlocksHover;
            labelSimplifiedTextHoverElement.textContent = t.labelSimplifiedTextHover;
            labelReadableFontHoverElement.textContent = t.labelReadableFontHover;
            labelSoftColorsHoverElement.textContent = t.labelSoftColorsHover;

            // Replace [Logo] placeholder in footer text with the SVG icon
            // Updates the footer text, replacing a placeholder with the footer logo SVG.
            if (t.footerText && footerTextElement) {
                footerTextElement.innerHTML = t.footerText.replace('[L]', ICON_FOOTER_LOGO);
            } else if (footerTextElement) {
            
                // Clears the footer text if no translation is available.
                footerTextElement.textContent = ''; // Clear if no translation for footer
            
            }

            // Sets the `lang` attribute of the HTML document to the current language.
            document.documentElement.lang = lang;
        
        }

        // Event listener for the floating widget button (FAB).
        // Toggles the visibility of the main widget menu and updates the FAB icon.
        if (floatingWidgetBtn && adaptEaseMenu) {
            floatingWidgetBtn.addEventListener('click', (event) => {
        
                // Checks if the menu is currently open before toggling.
                const isMenuOpen = adaptEaseMenu.style.display === 'block'; // Check state *before* toggling
        
                // Toggles the display style of the menu between 'block' (open) and 'none' (closed).
                adaptEaseMenu.style.display = isMenuOpen ? 'none' : 'block';
                
                // Update icon based on the *new* state of the menu
                // Updates the FAB icon based on whether the menu is now open or closed.
                floatingWidgetBtn.innerHTML = (adaptEaseMenu.style.display === 'block') ? ICON_WIDGET_CLOSE : ICON_WIDGET_OPEN;

                // If the menu was just closed, also close the language dropdown if it's open.
                if (adaptEaseMenu.style.display === 'none' && languageDropdown && currentLanguageButton) { // If menu just closed
                    languageDropdown.style.display = 'none';
                    currentLanguageButton.classList.remove('open');
                    currentLanguageButton.setAttribute('aria-expanded', 'false');
                }
        
                // Stops the event from propagating further up the DOM tree.
                event.stopPropagation();
        
            });
        }

        // Event listeners for the language selection functionality.
        // Handles opening/closing the language dropdown and selecting a new language.
        if (currentLanguageButton && languageDropdown && langOptions && langOptions.length > 0) {
        
            // Adds a click listener to the current language button to toggle the dropdown.
            currentLanguageButton.addEventListener('click', (event) => {
                
                // Stop propagating the events to part of the widget
                event.stopPropagation();

                // Checks if the dropdown is currently open.
                const isOpen = languageDropdown.style.display === 'block';
                
                // Toggles the display of the language dropdown.
                languageDropdown.style.display = isOpen ? 'none' : 'block';
                
                // Toggles the 'open' class on the button for styling.
                currentLanguageButton.classList.toggle('open', !isOpen);
                
                // Updates the ARIA expanded attribute for accessibility.
                currentLanguageButton.setAttribute('aria-expanded', String(!isOpen));
            
            });
            
            // Adds a click listener to each language option in the dropdown.
            langOptions.forEach(option => {
                option.addEventListener('click', () => {
            
                    // Gets the selected language code from the data-lang attribute.
                    const selectedLang = option.getAttribute('data-lang');
            
                    // If the selected language is different from the current one.
                    if (selectedLang !== currentLanguage) {
            
                        // Updates the current language.
                        currentLanguage = selectedLang;
                        // Updates all UI text to the new language.
                        updateUIText(currentLanguage);
            
                    }
            
                    // Closes the language dropdown after selection.
                    if (languageDropdown && currentLanguageButton) {
                        languageDropdown.style.display = 'none';
                        currentLanguageButton.classList.remove('open');
                        currentLanguageButton.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        }

        // Event listener for the "Readable Font" button.
        // Toggles the readable font style (OpenDyslexic/Lexend) and word spacing.
        if (buttonReadableFont) {
            buttonReadableFont.addEventListener('click', () => {
                // Toggles the active state of the readable font feature.
                isReadableFontActive = !isReadableFontActive;
            
                // Toggles the 'active' class on the button for visual feedback.
                buttonReadableFont.classList.toggle('active', isReadableFontActive);
            
                // Selects all target text elements.
                const targetTextElements = document.querySelectorAll(WIDGET_CONFIG.textClassName);
            
                // Sets word spacing based on whether the feature is active.
                const newWordSpacing = isReadableFontActive ? "0.5em" : "normal";

                // Dynamically construct the font family string
                // Initializes an array to build the font stack.
                const fontStack = [];
            
                // If OpenDyslexic font loading is enabled and configured, add it to the stack.
                if (WIDGET_CONFIG.loadOpenDyslexicFont && WIDGET_CONFIG.openDyslexicFontConfig && WIDGET_CONFIG.openDyslexicFontConfig.fontFamilyName) {
                    fontStack.push(`'${WIDGET_CONFIG.openDyslexicFontConfig.fontFamilyName}'`);
                }
            
                // If Lexend font loading is enabled, add it to the stack.
                if (WIDGET_CONFIG.loadLexendFont) {
                    fontStack.push("'Lexend'");
                }
            
                // Adds fallback fonts.
                fontStack.push("'Comic Sans MS'", "cursive"); // Fallbacks
            
                // Joins the font stack into a comma-separated string for CSS font-family property.
                const dyslexicFontFamily = fontStack.join(', ');

                // Iterates over each target text element to apply/revert styles.
                targetTextElements.forEach((element) => {
            
                    // Applies the new word spacing.
                    element.style.wordSpacing = newWordSpacing;
            
                    // If the feature is active.
                    if (isReadableFontActive) {
            
                        // If the element's original font-family hasn't been stored, store it.
                        if (!originalElementFontFamilies.has(element)) {
                            originalElementFontFamilies.set(element, element.style.fontFamily);
                        }
            
                        // Applies the dyslexic-friendly font family.
                        element.style.fontFamily = dyslexicFontFamily;
            
                    } else {
            
                        // If the feature is being deactivated.
                        // If the original font-family was stored, revert to it.
                        if (originalElementFontFamilies.has(element)) {
                            element.style.fontFamily = originalElementFontFamilies.get(element);
                        } else {
            
                            // Otherwise, clear the inline font-family style.
                            element.style.fontFamily = '';
            
                        }
                    }
                });
            });
        }

        // Handle Soft Colors button separately
        // Event listener for the "Soft Colors" button.
        // Toggles a CSS class on the document's root element to apply soft color styles.
        if (buttonSoftColors) {
            buttonSoftColors.addEventListener('click', () => {
            
                // Toggles the active state of the soft colors feature.
                isSoftColorsActive = !isSoftColorsActive;
            
                // Toggles the 'active' class on the button for visual feedback.
                buttonSoftColors.classList.toggle('active', isSoftColorsActive);
            
                // Toggles a class on the document's root element (<html>) to apply/remove soft color styles.
                document.documentElement.classList.toggle('adaptease-soft-colors-active', isSoftColorsActive);
            
            });
        }

        // Updated: Event listener for TextInBlocks button
        // Event listener for the "Text in Blocks" button.
        // Handles activation/deactivation, API calls, caching, and mutual exclusivity with Simplified Text.
        if (buttonTextInBlocks && buttonSimplifiedText) {
            buttonTextInBlocks.addEventListener('click', async () => {
            
                // Retrieves the current feature states for the active language.
                let currentFeatureStates = activeFeatures_perLang.get(currentLanguage) || { textInBlocks: false, simplifiedText: false };
            
                // Determines if the button click is intended to activate the feature.
                const isActivating = !currentFeatureStates.textInBlocks;

                // Prevent deactivation if this specific feature in this specific language is currently processing an API call
                // Prevents deactivation if an API call for this specific feature and language is already in progress.
                if (isProcessingFeature && activeApiCallDetails &&
                    activeApiCallDetails.name === 'textInBlocks' &&
                    activeApiCallDetails.lang === currentLanguage && // Check current language
                    !isActivating) {
            
                    // Logs a warning and provides visual feedback (bump animation).
                    console.warn("AdaptEase: TextInBlocks API call for current language in progress. Deactivation blocked.");
                    buttonTextInBlocks.classList.add('adaptease-button-bump-feedback');
                    setTimeout(() => buttonTextInBlocks.classList.remove('adaptease-button-bump-feedback'), 300);
            
                    // Exits the function, blocking the action.
                    return;
                }

                // Stores the language active at the moment of the click.
                const originalClickLanguage = currentLanguage;

                // Creates a mutable copy of the current feature states.
                const newFeatureStates = { ...currentFeatureStates };

                // --- Mutual exclusivity: If activating TextInBlocks, deactivate SimplifiedText ---
                // If activating "Text in Blocks".
                if (isActivating) {
            
                    // If "Simplified Text" is currently active, deactivate it.
                    if (newFeatureStates.simplifiedText) {
                        newFeatureStates.simplifiedText = false;
            
                        // Revert simplified text elements to their absolute original state
                        // This ensures TextInBlocks operates on the true original.
                        // Reverts all target text elements to their original HTML content.
                        document.querySelectorAll(WIDGET_CONFIG.textClassName).forEach(element => {
                            if (originalElementHTML.has(element)) {
                                element.innerHTML = originalElementHTML.get(element);
                            }
                        });
                    }
            
                    // Activates "Text in Blocks".
                    newFeatureStates.textInBlocks = true;
            
                } else {
                    
                    // Deactivates "Text in Blocks".
                    newFeatureStates.textInBlocks = false;
                
                }
                
                // Updates the feature states for the original click language.
                activeFeatures_perLang.set(originalClickLanguage, newFeatureStates);
                
                // --- End mutual exclusivity ---

                // Flag to determine if the current operation will require an API call.
                let thisOperationWouldNeedApi = false;
                
                // If activating the feature.
                if (isActivating) {
                
                    // Selects all target text elements for checking.
                    const targetTextElementsForCheck = document.querySelectorAll(WIDGET_CONFIG.textClassName);
                
                    // Gets the cached content for the current language.
                    const langCacheForCheck = cachedChunkedHTML_perLang.get(originalClickLanguage);
                
                    // Iterates through elements to check if any require API processing.
                    for (const element of targetTextElementsForCheck) {
                
                        // If the element's processed content is not in the cache.
                        if (!(langCacheForCheck && langCacheForCheck.has(element))) {
                
                            // Element not in cache, check if it has actual text content
                            // Retrieves the original HTML for the element.
                            const originalHtmlForCheck = originalElementHTML.get(element);
                
                            // Warns if original HTML is missing.
                             if (originalHtmlForCheck === undefined) {
                                console.warn("AdaptEase: Original HTML not found for element during API need check (TextInBlocks).", element);
                                continue; // Skip if no original HTML (should not happen if logic is correct)
                            }
                
                            // Creates a temporary div to extract plain text content.
                            const tempDiv = document.createElement('div');
                
                            // Uses original HTML for text check
                            tempDiv.innerHTML = originalHtmlForCheck;
                
                            // If the element has non-empty text content, an API call is needed.
                            if ((tempDiv.textContent || tempDiv.innerText || "").trim() !== "") {
                                thisOperationWouldNeedApi = true;
                                break; // Exit loop as API call is confirmed needed
                            }
                        }
                    }
                }

                // Flag to indicate if this specific call will set the global processing flag.
                let setProcessingFlagForThisCall = false;
                
                // Flag for cache-based animation
                let setShortAnimationForCache = false; // Flag for cache-based animation
                
                // If an API call is determined to be needed.
                if (thisOperationWouldNeedApi) {
                
                    // Only one API call at a time globally
                    // If no other API call is currently in progress.
                    if (!isProcessingFeature) {
                
                        // Set global processing flag to true.
                        isProcessingFeature = true;
                
                        // Set details of the active API call.
                        activeApiCallDetails = { name: 'textInBlocks', lang: originalClickLanguage }; // Set details
                
                        // Mark that this call is responsible for setting the global processing flag.
                        setProcessingFlagForThisCall = true;
                
                        // showLoadingAnimation(); // REMOVED: updateFeatureButtonStates will handle this
                        // adaptease-button-processing will be added by updateFeatureButtonStates
                
                    }
                } else if (isActivating) { // If activating from cache and no API call is active
                
                    // If activating from cache and no API call is active, set flag for short animation.
                    setShortAnimationForCache = true;
                    
                    // Set global flag for temporary animation.
                    isShortAnimationActive = true; // NEW: Set flag for temporary animation
                    
                    // Show loading animation immediately for cache load.
                    showLoadingAnimation(); // Show animation for cache load (direct call for temporary animation)
                
                }
                
                // Call updateFeatureButtonStates immediately after potential state changes and before API calls
                // Updates the button states to reflect the new processing/active state.
                updateFeatureButtonStates(currentLanguage);

                // Selects all target text elements again.
                const targetTextElements = document.querySelectorAll(WIDGET_CONFIG.textClassName);
                
                try {
                
                    // Flag to track if an error occurred during activation.
                    let errorDuringActivation = false;
                
                    // If activating the feature.
                    if (isActivating) {
                
                        // Get or create the cache map for chunked HTML for the current language.
                        let langCacheChunked = cachedChunkedHTML_perLang.get(originalClickLanguage);

                        // Ensure cache map exists for the language
                        if (!langCacheChunked) { 
                            langCacheChunked = new Map();
                            cachedChunkedHTML_perLang.set(originalClickLanguage, langCacheChunked);
                        }

                        // Iterates over each target text element to process or retrieve from cache.
                        for (const element of targetTextElements) {
                            
                            // When activating, always source from originalElementHTML for processing if not in processed cache.
                            // textBeforeBlocksApplied.set(element, element.innerHTML); // REMOVED

                            // If processed content is already in cache, use it.
                            if (langCacheChunked.has(element)) {
                                element.innerHTML = langCacheChunked.get(element); // Use cached processed content
                            } else {
                            
                                // If not in cache, get the original HTML for processing.
                                const baseHtmlForProcessing = originalElementHTML.get(element);
                            
                                // Warns if original HTML is missing.
                                if (baseHtmlForProcessing === undefined) {
                                    console.warn("AdaptEase: Original HTML not found for element during TextInBlocks processing.", element);
                                    continue;
                                }

                                // Extracts plain text content from the original HTML for API submission.
                                const originalTextContentForApi = (() => {
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = baseHtmlForProcessing; // Use from originalElementHTML
                                    return tempDiv.textContent || tempDiv.innerText || "";
                                })();

                                // If the original text content is empty, cache the empty state and skip API call.
                                if (originalTextContentForApi.trim() === "") {
                            
                                    // If original is empty, we can cache the original (empty) state
                                    // to prevent re-processing attempts for this language.
                                    langCacheChunked.set(element, baseHtmlForProcessing);
                            
                                    // If the current language matches the click language, update the DOM.
                                    if (currentLanguage === originalClickLanguage) {
                                        element.innerHTML = baseHtmlForProcessing;
                                    }
                                    continue; 
                                }

                                // If an API call is needed for this operation.
                                if (thisOperationWouldNeedApi) {
                                    try {
                            
                                        // Makes a POST request to the text-in-blocks API endpoint.
                                        const response = await fetch(`${WIDGET_CONFIG.pythonApiBaseUrl}/text-in-blocks`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ text: originalTextContentForApi, lang: originalClickLanguage })
                                        });
                            
                                        // Checks if the API response was successful.
                                        if (!response.ok) {
                            
                                            // Parses error data from the response.
                                            const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
                            
                                            // Throws an error with details.
                                            throw new Error(`HTTP error! Status: ${response.status}. ${errorData.error || errorData.detail}`);
                            
                                        }
                            
                                        // Parses the successful response as JSON.
                                        const data = await response.json();
                            
                                        // Checks if the processed text is valid (an array).
                                        if (data.processed_text !== undefined && Array.isArray(data.processed_text)) {
                            
                                            // Joins the processed text chunks with line breaks.
                                            const newChunkedHTML = data.processed_text.join('<br><br>');
                            
                                            // If the current language matches the click language, update the DOM.
                                            if (currentLanguage === originalClickLanguage) {
                                                element.innerHTML = newChunkedHTML;
                                            }
                            
                                            // Caches the processed HTML.
                                            langCacheChunked.set(element, newChunkedHTML);
                            
                                        } else {
                            
                                            // Throws an error if the API response format is invalid.
                                            throw new Error("Invalid processed_text format from API.");
                            
                                        }
                                    } catch (error) {
                            
                                        // Logs any errors during API processing.
                                        console.error("Error activating TextInBlocks for element:", error);
                            
                                        // Reversion to original will be handled by updateUIText if state is correctly set
                                        // Sets the error flag.
                                        errorDuringActivation = true;
                                        break; // Exit loop on error
                                    }
                                } else {
                            
                                    // Activating, element not in cache, but this operation was deemed cache-only
                                    // Revert this element to its original state as a safety measure.
                                    // If activating, but no API call was expected (meaning it should have been in cache),
                                    // revert the element to its original state as a fallback.
                                    if (originalElementHTML.has(element)) {
                                        element.innerHTML = originalElementHTML.get(element);
                                    }
                                    console.warn(`AdaptEase: TextInBlocks for element (lang: ${originalClickLanguage}) was not processed. Expected cache miss within a cache-only operation.`);
                                }
                            }
                        }

                        // If an error occurred during activation.
                        if (errorDuringActivation) {

                            // Revert feature state if activation failed
                            // Retrieves the feature states for the original click language.
                            const finalStates = activeFeatures_perLang.get(originalClickLanguage) || { textInBlocks: false, simplifiedText: false };

                            // Marks "Text in Blocks" as not active.
                            finalStates.textInBlocks = false; // Mark as not active

                            // Updates the feature states.
                            activeFeatures_perLang.set(originalClickLanguage, { ...finalStates });

                            // updateUIText in the finally block will handle DOM reversion for the currentLanguage

                        }

                    } else { // Deactivating TextInBlocks

                        // State is already updated (newFeatureStates.textInBlocks = false).
                        // updateUIText in the finally block will revert elements to original for originalClickLanguage
                        // if it's the current language, or when switching to it.

                    }
                } finally {

                    // This block always executes after try/catch, regardless of success or failure.
                    // If this call was responsible for setting the global processing flag.
                    if (setProcessingFlagForThisCall) {

                        // Clear global processing flag.
                        isProcessingFeature = false;

                        // Clear active API call details.
                        activeApiCallDetails = null; // Clear details

                        // hideLoadingAnimation(); // REMOVED: updateFeatureButtonStates will handle this
                        // Update button states immediately after API finishes.
                        updateFeatureButtonStates(currentLanguage); // Update buttons immediately after API finishes

                    } else if (setShortAnimationForCache) { // NEW: Hide short animation after delay for cache hits

                        // If a short animation was triggered for a cache hit, hide it after a delay.
                        setTimeout(() => {
                            hideLoadingAnimation();

                            // Clear the short animation flag.
                            isShortAnimationActive = false; // NEW: Clear flag

                            // Update button states after the short animation.
                            updateFeatureButtonStates(currentLanguage); // Update buttons after short animation
                        }, 1000); // Play for 1 second
                    } else {

                        // If neither API call nor cache animation, just update buttons (e.g., deactivation of a cached feature)
                        // If no API call or cache animation, simply update button states.
                        updateFeatureButtonStates(currentLanguage);

                    }

                    // If the click action (activation or deactivation) pertained to the
                    // currently displayed language, then its content needs to be refreshed.
                    // If the action was for the currently displayed language, refresh content elements.
                    if (originalClickLanguage === currentLanguage) {
                        refreshContentElements(currentLanguage);
                    }
                }
            });
        }

        // Event listener for SimplifiedText button
        // Event listener for the "Simplified Text" button.
        // Handles activation/deactivation, API calls, caching, and mutual exclusivity with Text in Blocks.
        if (buttonSimplifiedText && buttonTextInBlocks) {
            buttonSimplifiedText.addEventListener('click', async () => {

                // Retrieves the current feature states for the active language.
                let currentFeatureStates = activeFeatures_perLang.get(currentLanguage) || { textInBlocks: false, simplifiedText: false };

                // Determines if the button click is intended to activate the feature.
                const isActivating = !currentFeatureStates.simplifiedText;

                // Prevents deactivation if an API call for this specific feature and language is already in progress.
                if (isProcessingFeature && activeApiCallDetails &&
                    activeApiCallDetails.name === 'simplifiedText' &&
                    activeApiCallDetails.lang === currentLanguage && // Check current language
                    !isActivating) {

                    // Logs a warning and provides visual feedback (bump animation).
                    console.warn("AdaptEase: SimplifiedText API call for current language in progress. Deactivation blocked.");
                    buttonSimplifiedText.classList.add('adaptease-button-bump-feedback');
                    setTimeout(() => buttonSimplifiedText.classList.remove('adaptease-button-bump-feedback'), 300);

                    // Exits the function, blocking the action.
                    return;
                }

                // Stores the language active at the moment of the click.
                const originalClickLanguage = currentLanguage;

                // Creates a mutable copy of the current feature states.
                const newFeatureStates = { ...currentFeatureStates };

                // If activating "Simplified Text".
                if (isActivating) {

                    // If "Text in Blocks" is currently active, deactivate it.
                    if (newFeatureStates.textInBlocks) {
                        newFeatureStates.textInBlocks = false;

                        // NEW: Explicitly revert TextInBlocks DOM changes for the current language
                        // to their absolute original state before proceeding with SimplifiedText activation.
                        // Reverts all target text elements to their original HTML content.
                        document.querySelectorAll(WIDGET_CONFIG.textClassName).forEach(element => {
                            if (originalElementHTML.has(element)) {
                                element.innerHTML = originalElementHTML.get(element);
                            }
                        });
                    }

                    // Activates "Simplified Text".
                    newFeatureStates.simplifiedText = true;

                } else { 

                    // Deactivates "Simplified Text".
                    newFeatureStates.simplifiedText = false;

                }
                // Updates the feature states for the original click language.
                activeFeatures_perLang.set(originalClickLanguage, newFeatureStates);

                // Flag to determine if the current operation will require an API call.
                let thisOperationWouldNeedApi = false;
                
                // If activating the feature.
                if (isActivating) {
                    
                    // Selects all target text elements for checking.
                    const targetTextElementsForCheck = document.querySelectorAll(WIDGET_CONFIG.textClassName);
                    
                    // Gets the cached content for the current language.
                    const langCacheForCheck = cachedSimplifiedText_perLang.get(originalClickLanguage);
                    
                    // Iterates through elements to check if any require API processing.
                    for (const element of targetTextElementsForCheck) {
                        
                        // If the element's processed content is not in the cache.
                        if (!(langCacheForCheck && langCacheForCheck.has(element))) {
                            
                            // Retrieves the original HTML for the element.
                            const originalHtmlForCheck = originalElementHTML.get(element);
                             
                            // Warns if original HTML is missing.
                             if (originalHtmlForCheck === undefined) {
                                console.warn("AdaptEase: Original HTML not found for element during API need check (SimplifiedText).", element);
                                continue;
                            }
                            
                            // Creates a temporary div to extract plain text content.
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = originalHtmlForCheck;
                            
                            // If the element has non-empty text content, an API call is needed.
                            if ((tempDiv.textContent || tempDiv.innerText || "").trim() !== "") {
                                thisOperationWouldNeedApi = true;
                                break;
                            }
                        }
                    }
                }

                // Flag to indicate if this specific call will set the global processing flag.
                let setProcessingFlagForThisCall = false;
                
                // Flag for cache-based animation
                let setShortAnimationForCache = false; // Flag for cache-based animation
                
                // If an API call is determined to be needed.
                if (thisOperationWouldNeedApi) {
                    
                    // Only one API call at a time globally
                    // If no other API call is currently in progress.
                    if (!isProcessingFeature) {
                        
                        // Set global processing flag to true.
                        isProcessingFeature = true;
                        
                        // Set details of the active API call.
                        activeApiCallDetails = { name: 'simplifiedText', lang: originalClickLanguage }; // Set details
                        
                        // Mark that this call is responsible for setting the global processing flag.
                        setProcessingFlagForThisCall = true;
                        
                        // showLoadingAnimation(); // REMOVED: updateFeatureButtonStates will handle this
                        // adaptease-button-processing will be added by updateFeatureButtonStates
                    
                    }
                } else if (isActivating) { 
                    
                    // If activating from cache and no API call is active, set flag for short animation.
                    setShortAnimationForCache = true;
                    
                    // Set global flag for temporary animation.
                    isShortAnimationActive = true; // NEW: Set flag for temporary animation
                    
                    // Show loading animation immediately for cache load.
                    showLoadingAnimation(); // Show animation for cache load (direct call for temporary animation)
                
                }
                
                // Call updateFeatureButtonStates immediately after potential state changes and before API calls
                // Updates the button states to reflect the new processing/active state.
                updateFeatureButtonStates(currentLanguage);

                // Selects all target text elements again.
                const targetTextElements = document.querySelectorAll(WIDGET_CONFIG.textClassName);
                try {
                    
                    // Flag to track if an error occurred during activation.
                    let errorDuringActivation = false;
                    
                    // If activating the feature.
                    if (isActivating) {
                        
                        // Get or create the cache map for simplified text for the current language.
                        let langCacheSimplified = cachedSimplifiedText_perLang.get(originalClickLanguage);
                        if (!langCacheSimplified) {
                            langCacheSimplified = new Map();
                            cachedSimplifiedText_perLang.set(originalClickLanguage, langCacheSimplified);
                        }

                        // Iterates over each target text element to process or retrieve from cache.
                        for (const element of targetTextElements) {

                            // If processed content is already in cache, use it.
                            if (langCacheSimplified.has(element)) {
                                element.innerHTML = langCacheSimplified.get(element);
                            } else {
                                
                                // If not in cache, get the original HTML for processing.
                                const baseHtmlForProcessing = originalElementHTML.get(element);
                                
                                // Warns if original HTML is missing.
                                if (baseHtmlForProcessing === undefined) {
                                    console.warn("AdaptEase: Original HTML not found for element during SimplifiedText processing.", element);
                                    continue;
                                }
                               
                                // Extracts plain text content from the original HTML for API submission.
                                const originalTextContentForApi = (() => {
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = baseHtmlForProcessing; // Use from originalElementHTML
                                    return tempDiv.textContent || tempDiv.innerText || "";
                                })();

                                // If the original text content is empty, cache the empty state and skip API call.
                                if (originalTextContentForApi.trim() === "") {
                                    langCacheSimplified.set(element, baseHtmlForProcessing);
                                    
                                    // If the current language matches the click language, update the DOM.
                                    if (currentLanguage === originalClickLanguage) {
                                        element.innerHTML = baseHtmlForProcessing;
                                    }
                                    continue;
                                }

                                // If an API call is needed for this operation.
                                if (thisOperationWouldNeedApi) {
                                    try {
                                        
                                        // Makes a POST request to the simplify-text API endpoint.
                                        const response = await fetch(`${WIDGET_CONFIG.pythonApiBaseUrl}/simplify-text`, { // Ensure correct endpoint
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ text: originalTextContentForApi, lang: originalClickLanguage })
                                        });
                                        
                                        // Checks if the API response was successful.
                                        if (!response.ok) {
                                            
                                            // Parses error data from the response.
                                            const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
                                            
                                            // Throws an error with details.
                                            throw new Error(`HTTP error! Status: ${response.status}. ${errorData.error || errorData.detail}`);
                                        }
                                        
                                        // Parses the successful response as JSON.
                                        const data = await response.json();
                                        
                                        // Adjust for simplify-text potentially returning string or array
                                        // Checks if the processed text is valid (string or array).
                                        if (data.processed_text !== undefined && (Array.isArray(data.processed_text) || typeof data.processed_text === 'string')) {
                                            
                                            // Joins array elements with line breaks, or uses the string directly.
                                            const newSimplifiedHTML = Array.isArray(data.processed_text) ? data.processed_text.join('<br><br>') : data.processed_text;
                                            
                                            // If the current language matches the click language, update the DOM.
                                            if (currentLanguage === originalClickLanguage) {
                                                element.innerHTML = newSimplifiedHTML;
                                            }
                                            
                                            // Caches the processed HTML.
                                            langCacheSimplified.set(element, newSimplifiedHTML);
                                        } else {
                                            // Throws an error if the API response format is invalid.
                                            throw new Error("Invalid processed_text format from API for simplified text.");
                                        }
                                    } catch (error) {
                                        
                                        // Logs any errors during API processing.
                                        console.error("Error activating SimplifiedText for element:", error);
                                        
                                        // Reversion to original will be handled by updateUIText
                                        // Sets the error flag.
                                        errorDuringActivation = true;
                                        break;
                                    }
                                } else {
                                    
                                    // If activating, but no API call was expected (meaning it should have been in cache),
                                    // revert the element to its original state as a fallback.
                                    if (originalElementHTML.has(element)) {
                                        element.innerHTML = originalElementHTML.get(element);
                                    }
                                    console.warn(`AdaptEase: SimplifiedText for element (lang: ${originalClickLanguage}) was not processed. Expected cache miss within a cache-only operation.`);
                                }
                            }
                        }

                        // If an error occurred during activation.
                        if (errorDuringActivation) {
                            
                            // Retrieves the feature states for the original click language.
                            const finalStates = activeFeatures_perLang.get(originalClickLanguage) || { textInBlocks: false, simplifiedText: false };
                            
                            // Marks "Simplified Text" as not active.
                            finalStates.simplifiedText = false; // Mark as not active
                            
                            // Updates the feature states.
                            activeFeatures_perLang.set(originalClickLanguage, { ...finalStates });
                            // updateUIText in the finally block will handle DOM reversion
                        }
                    } else { // Deactivating SimplifiedText
                        // State is already updated.
                        // activeFeatures_perLang was set earlier.
                        // The refreshContentElements in the finally block will handle DOM reversion
                        // if originalClickLanguage is the currentLanguage.
                    }
                } finally {
                    
                    // This block always executes after try/catch, regardless of success or failure.
                    // If this call was responsible for setting the global processing flag.
                    if (setProcessingFlagForThisCall) {
                        
                        // Clear global processing flag.
                        isProcessingFeature = false;
                        
                        // Clear active API call details.
                        activeApiCallDetails = null; // Clear details
                        
                        // hideLoadingAnimation(); // REMOVED: updateFeatureButtonStates will handle this
                        // Update button states immediately after API finishes.
                        updateFeatureButtonStates(currentLanguage); // Update buttons immediately after API finishes
                    } else if (setShortAnimationForCache) { // NEW: Hide short animation after delay for cache hits
                        
                        // If a short animation was triggered for a cache hit, hide it after a delay.
                        setTimeout(() => {
                            hideLoadingAnimation();
                            
                            // Clear the short animation flag.
                            isShortAnimationActive = false; // NEW: Clear flag
                           
                            // Update button states after the short animation.
                            updateFeatureButtonStates(currentLanguage); // Update buttons after short animation
                        }, 1000); // Play for 1 second
                    } else {
                        
                        // If neither API call nor cache animation, just update buttons
                        // If no API call or cache animation, simply update button states.
                        updateFeatureButtonStates(currentLanguage);
                    }
                    
                    // Always update button states for the current view to reflect final state

                    // If the click action (activation or deactivation) pertained to the
                    // currently displayed language, then its content needs to be refreshed.
                    // If the action was for the currently displayed language, refresh content elements.
                    if (originalClickLanguage === currentLanguage) {
                        refreshContentElements(currentLanguage);
                    }
                }
            });
        }

        // Defines an array of utility buttons (currently commented out/removed).
        const utilityButtons = [
            // { button: buttonTextInBlocks, alertKey: 'alertTextInBlocks' }, // Removed
            // { button: buttonSimplifiedText, alertKey: 'alertSimplifiedText' } // Removed
            // buttonSoftColors is handled separately
        ];

        // Iterates over utility buttons to add click listeners (currently no active buttons here).
        utilityButtons.forEach(item => {
            if (item.button) {
                item.button.addEventListener('click', () => {
                    
                    // If an alert key is defined and translation exists, show an alert.
                    if (item.alertKey && translations[currentLanguage] && translations[currentLanguage][item.alertKey]) {
                        alert(translations[currentLanguage][item.alertKey]);
                    }
                
                });
            }
        });

        // Global click listener to handle closing the widget menu or language dropdown
        // when clicking outside of them.
        document.addEventListener('click', (event) => {
            
            // If widget menu or floating button don't exist, exit.
            if (!adaptEaseMenu || !floatingWidgetBtn) return;
            
            // If the language dropdown is open and the click is outside the language button and dropdown itself.
            if (languageDropdown && languageDropdown.style.display === 'block' &&
                currentLanguageButton && !currentLanguageButton.contains(event.target) &&
                !languageDropdown.contains(event.target)) {
                
                    // Close the language dropdown.
                languageDropdown.style.display = 'none';
                currentLanguageButton.classList.remove('open');
                currentLanguageButton.setAttribute('aria-expanded', 'false');
            }
            
            // Checks if the click was inside the widget menu or on the floating button.
            const isClickInsideMenu = adaptEaseMenu.contains(event.target);
            const isClickOnWidgetButton = floatingWidgetBtn.contains(event.target);
            
            // If the widget menu is open and the click was outside both the menu and the floating button.
            if (adaptEaseMenu.style.display === 'block' && !isClickInsideMenu && !isClickOnWidgetButton) {
                
                // Close the widget menu.
                adaptEaseMenu.style.display = 'none';
                
                // Reset the floating button icon to the "open" state.
                floatingWidgetBtn.innerHTML = ICON_WIDGET_OPEN; // Reset to open icon
                
                // If the language dropdown is also open, close it.
                if (languageDropdown && languageDropdown.style.display === 'block' && currentLanguageButton) {
                    languageDropdown.style.display = 'none';
                    currentLanguageButton.classList.remove('open');
                    currentLanguageButton.setAttribute('aria-expanded', 'false');
                }
            }
        });
        
        // Initializes the UI text with the current language when the widget logic is set up.
        updateUIText(currentLanguage);
    }

    // Asynchronous function to load all necessary widget resources (Lottie, fonts, HTML, CSS, translations)
    // and then initialize the widget logic.
    async function loadAndInitializeAdaptEaseWidget() {
        
        try {
            
            // NEW: Load Lottie player script
            // Awaits the loading of the Lottie player script.
            await loadLottiePlayer();

            // ENSURE ALL DYNAMIC LOADING OF LEXEND FROM GOOGLE APIS IS REMOVED
            // The WIDGET_CONFIG.loadLexendFont flag can now be used to decide
            // if the 'Lexend' font-family is applied via CSS, or you can always apply it.
            // No <link> tags for Lexend should be created here.

            // Load OpenDyslexic font if configured (this part remains if you use it)
            // Checks if OpenDyslexic font loading is enabled and configured.
            if (WIDGET_CONFIG.loadOpenDyslexicFont && WIDGET_CONFIG.openDyslexicFontConfig) {
                
                // Destructures font configuration properties.
                const { fontFamilyName, basePath, files } = WIDGET_CONFIG.openDyslexicFontConfig;
                
                // Ensures necessary font configuration details are present.
                if (fontFamilyName && basePath && files && files.length > 0) {
                    
                    // Initializes an empty string to build CSS @font-face rules.
                    let fontFaceStyles = "";
                    
                    // Iterates over each font file defined in the configuration.
                    files.forEach(fontFile => {
                        
                        // Constructs the full URL for the font file.
                        const fontUrl = basePath + fontFile.name;
                        
                        // Determines the font format based on the file extension.
                        let format = '';
                        if (fontFile.name.endsWith('.otf')) format = 'opentype';
                        else if (fontFile.name.endsWith('.ttf')) format = 'truetype';
                        else if (fontFile.name.endsWith('.woff')) format = 'woff';
                        else if (fontFile.name.endsWith('.woff2')) format = 'woff2';

                        // Appends the @font-face rule for the current font file to the string.
                        fontFaceStyles += `
                            @font-face {
                                font-family: '${fontFamilyName}';
                                src: url('${fontUrl}')${format ? ` format('${format}')` : ''};
                                font-weight: ${fontFile.weight || 'normal'};
                                font-style: ${fontFile.style || 'normal'};
                                font-display: swap; /* Improves font loading behavior */
                            }
                        `;
                    });

                    // If font face styles were generated.
                    if (fontFaceStyles) {
                        
                        // Creates a new style element.
                        const openDyslexicStyleElement = document.createElement('style');
                        
                        // Sets the type and ID for the style element.
                        openDyslexicStyleElement.type = 'text/css';
                        openDyslexicStyleElement.id = 'adaptease-opendyslexic-font-styles';
                        
                        // Sets the text content of the style element to the generated font-face rules.
                        openDyslexicStyleElement.textContent = fontFaceStyles.trim();
                        
                        // Appends the style element to the document's head.
                        document.head.appendChild(openDyslexicStyleElement);
                        
                        // Logs that the font faces have been defined.
                        console.log(`AdaptEase: ${fontFamilyName} font faces defined.`);
                    }
                }
            }

            // Uses Promise.all to concurrently fetch the widget's HTML, CSS, and translations.
            const [htmlContent, cssContent, translationsData] = await Promise.all([
                fetchResource(WIDGET_CONFIG.htmlPath, 'text'),
                fetchResource(WIDGET_CONFIG.cssPath, 'text'),
                fetchResource(WIDGET_CONFIG.translationsPath, 'json')
            ]);

            // Creates a new style element for the widget's CSS.
            const styleElement = document.createElement('style');
            
            // Sets the type and ID for the style element.
            styleElement.type = 'text/css';
            styleElement.id = 'adaptease-widget-styles';
            
            // Sets the text content of the style element to the fetched CSS.
            styleElement.textContent = cssContent;
            
            // Appends the style element to the document's head.
            document.head.appendChild(styleElement);

            // Creates a new div element to wrap the widget's HTML.
            const widgetWrapper = document.createElement('div');
            
            // Sets the ID for the widget wrapper.
            widgetWrapper.id = 'adaptease-widget-container';
            
            // Sets the inner HTML of the wrapper to the fetched widget HTML.
            widgetWrapper.innerHTML = htmlContent;
            
            // Appends the widget wrapper to the document's body.
            document.body.appendChild(widgetWrapper);

            // Calls the function to set up all the JavaScript logic for the widget, passing the translations.
            setupWidgetLogic(translationsData);

        } catch (error) {
            
            // Catches and logs any errors that occur during loading or initialization.
            console.error('AdaptEase Widget: Failed to load or initialize.', error);
        
        }
    }

    // Checks the document's ready state.
    // If the document is still loading, waits for the 'DOMContentLoaded' event.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAndInitializeAdaptEaseWidget);
    } else {
        
        // If the document is already loaded, calls the initialization function immediately.
        loadAndInitializeAdaptEaseWidget();
    }

})();