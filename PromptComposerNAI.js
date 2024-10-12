// ==UserScript==
// @name         Prompt Composer NAI
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Helps compose a complete prompt for NovelAI Image generation, with segmented categories such as artists, participants, backgrounds, emotions.
// @author       Your Name
// @license      MIT
// @match        http*://novelai.net/image
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

(function() {
    'use strict';

    let tagArea = null;

    function openPromptComposer() {
        // Create modal container
        const modalDiv = $('<div></div>')
            .css({
                'position': 'fixed',
                'top': '50%',
                'left': '50%',
                'transform': 'translate(-50%, -50%)',
                'background-color': '#f9f9f9',
                'padding': '20px',
                'border': '2px solid #333',
                'border-radius': '10px',
                'z-index': '9999999999',
                'width': '400px',
                'max-height': '80%',
                'display': 'flex',
                'flex-direction': 'column',
                'overflow-y': 'auto'
            });

        const title = $('<h3>Prompt Composer</h3>').css({'text-align': 'center', 'margin-bottom': '20px', 'color': '#333'});
        modalDiv.append(title);

        // Categories for prompt
        const categories = {
            "Artists": ["Van Gogh", "Da Vinci", "Picasso", "Hokusai"],
            "Participants": ["Knight", "Dragon", "Princess", "Samurai"],
            "Backgrounds": ["Forest", "Castle", "Space", "Underwater"],
            "Emotions": ["Mystical", "Epic", "Serene", "Chaotic"]
        };

        // Object to store user selections
        let selectedOptions = {
            "Artists": [],
            "Participants": [],
            "Backgrounds": [],
            "Emotions": []
        };

        // Create checkboxes and text area for each category
        for (let category in categories) {
            const categoryContainer = $('<div></div>').css({'margin-bottom': '15px'});
            const label = $('<label></label>').text(category + ':').css({'font-weight': 'bold', 'color': '#333'});
            categoryContainer.append(label);

            // Create checkboxes for tags
            const checkboxContainer = $('<div></div>').css({'display': 'flex', 'flex-wrap': 'wrap', 'margin-top': '5px', 'gap': '10px'});
            categories[category].forEach(item => {
                const checkboxLabel = $('<label></label>').css({'color': '#333', 'display': 'flex', 'align-items': 'center', 'white-space': 'nowrap'});
                const checkbox = $('<input type="checkbox">').val(item).css({'margin-right': '5px'});
                checkbox.change(function() {
                    if (this.checked) {
                        selectedOptions[category].push(item);
                    } else {
                        selectedOptions[category] = selectedOptions[category].filter(val => val !== item);
                    }
                });
                checkboxLabel.append(checkbox).append(item);
                checkboxContainer.append(checkboxLabel);
            });
            categoryContainer.append(checkboxContainer);

            // Create multiline text area
            const textArea = $('<textarea></textarea>')
                .css({'width': '100%', 'margin-top': '10px', 'border-radius': '5px', 'padding': '5px'})
                .attr('placeholder', 'Enter custom ' + category.toLowerCase() + ' here...');
            textArea.on('input', function() {
                selectedOptions[category] = $(this).val().split(',').map(val => val.trim()).filter(val => val !== "");
            });

            categoryContainer.append(textArea);
            modalDiv.append(categoryContainer);
        }

        // Button to generate prompt
        const generateButton = $('<button>Generate Prompt</button>')
            .css({
                'color': '#333',
                'background-color': 'rgb(246, 245, 244)',
                'font-size': 'medium',
                'padding': '10px',
                'border': 'none',
                'border-radius': '5px',
                'cursor': 'pointer',
                'margin-bottom': '10px'
            })
            .click(() => {
                const combinedPrompt = Object.values(selectedOptions).flat().filter(val => val !== "").join(", ");
                tagArea = document.querySelectorAll("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']")[0];
                tagArea.value = combinedPrompt;
                modalDiv.remove();
            });

        // Button to close modal
        const cancelButton = $('<button>Close</button>')
            .css({
                'color': '#333',
                'background-color': '#ccc',
                'font-size': 'medium',
                'padding': '10px',
                'border': 'none',
                'border-radius': '5px',
                'cursor': 'pointer',
                'width': '100%'
            })
            .click(() => {
                modalDiv.remove();
            });

        modalDiv.append(generateButton).append(cancelButton);
        $('body').append(modalDiv);
    }

    function onReady() {
        setTimeout(placeComposerButton, 5000); // Add a delay of 5 seconds to ensure elements are loaded
    }

    function placeComposerButton() {
        let composeButton = $('<button>Compose Prompt</button>')
            .css({
                'color': '#333',
                'background-color': 'rgb(246, 245, 244)',
                'font-size': 'small',
                'padding': '5px 10px',
                'border': 'none',
                'border-radius': '5px',
                'cursor': 'pointer',
                'margin-bottom': '10px'
            })
            .click(openPromptComposer);

        // Insert the button above the first textarea in the sidebar
        let textAreas = document.querySelectorAll("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']");
        if (textAreas.length > 0) {
            let sidebar = textAreas[0].closest('div').parentElement;
            $(sidebar).prepend(composeButton);
        }
    }

    $(onReady);
})();