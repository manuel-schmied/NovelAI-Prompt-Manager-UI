// ==UserScript==
// @name         Prompt Composer NAI
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Helps compose a complete prompt for NovelAI Image generation, with segmented categories such as artists, participants, backgrounds, emotions. Allows adding and removing tags with persistent selections saved in local storage, using an array of objects for each tag entry to track state. The add tag input and delete buttons are usually hidden and shown on demand to reduce clutter.
// @author       Your Name
// @license      MIT
// @match        http*://novelai.net/image
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

(function() {
    'use strict';

    let tagArea = null;
    let selectedOptions = JSON.parse(localStorage.getItem('promptComposerSelectedOptions')) || {
        "Artists": [],
        "Participants": [],
        "Backgrounds": [],
        "Emotions": []
    };

    function saveSelectionsToLocalStorage() {
        localStorage.setItem('promptComposerSelectedOptions', JSON.stringify(selectedOptions));
    }

    function openPromptComposer() {
        // Remove existing modal if present to ensure only one instance is active
        $('#promptComposerModal').remove();

        // Create modal container
        const modalDiv = $('<div id="promptComposerModal"></div>')
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
                'width': '600px', // Increased width from 400px to 600px
                'max-height': '80%',
                'display': 'flex',
                'flex-direction': 'column',
                'overflow-y': 'auto'
            });

        const title = $('<h3>Prompt Composer</h3>').css({'text-align': 'center', 'margin-bottom': '20px', 'color': '#333'});
        modalDiv.append(title);

        // Create a container for the buttons
        const buttonContainer = $('<div></div>').css({
            'display': 'flex',
            'justify-content': 'flex-start',
            'margin-bottom': '20px'
        });

        // Add a single "Edit Tags" button
        const editButton = $('<button>Edit Tags</button>').css({
            'padding': '5px 10px',
            'border-radius': '5px',
            'border': 'none',
            'cursor': 'pointer',
            'background-color': '#666',
            'color': '#fff',
            'margin-right': '10px'
        }).click(() => {
            $('.add-tag-container').toggle();
            $('.delete-button').toggle();
            // Set display to flex when visible
            $('.add-tag-container').each(function() {
                if ($(this).is(':visible')) {
                    $(this).css('display', 'flex');
                }
            });
        });
        buttonContainer.append(editButton);

        // Add a "Toggle Weights" button next to the "Edit Tags" button
        const weightToggleButton = $('<button>Toggle Weights</button>').css({
            'padding': '5px 10px',
            'border-radius': '5px',
            'border': 'none',
            'cursor': 'pointer',
            'background-color': '#666',
            'color': '#fff'
        }).click(() => {
            const weightsVisible = !$('.weight-control').first().is(':visible');
            $('.weight-control').toggle(weightsVisible);
            $('.weight-display').each(function() {
                const label = $(this).closest('label');
                const weightControl = label.find('.weight-control');
                const tag = {
                    weight: parseFloat(weightControl.find('input[type="number"]').val())
                };
                updateWeightDisplay(tag, $(this), weightControl);
            });
        });
        buttonContainer.append(weightToggleButton);

        // Append the button container to the modal
        modalDiv.append(buttonContainer);

        // Use stored categories as fallback
        let categories = JSON.parse(localStorage.getItem('promptComposerSelectedOptions')) || {
            "Artists": [{ name: "Van Gogh", active: false }, { name: "Da Vinci", active: false }, { name: "Picasso", active: false }, { name: "Hokusai", active: false }],
            "Participants": [{ name: "Knight", active: false }, { name: "Dragon", active: false }, { name: "Princess", active: false }, { name: "Samurai", active: false }],
            "Backgrounds": [{ name: "Forest", active: false }, { name: "Castle", active: false }, { name: "Space", active: false }, { name: "Underwater", active: false }],
            "Emotions": [{ name: "Mystical", active: false }, { name: "Epic", active: false }, { name: "Serene", active: false }, { name: "Chaotic", active: false }]
        };

        // Create checkboxes, text area, and add/remove functionality for each category
        for (let category in selectedOptions) {
            const categoryContainer = $('<div></div>').css({'margin-bottom': '15px'});
            const label = $('<label></label>').text(category + ':').css({'font-weight': 'bold', 'color': '#333'});
            categoryContainer.append(label);

            // Create checkboxes for tags
            const checkboxContainer = $('<div></div>').css({'display': 'flex', 'flex-wrap': 'wrap', 'margin-top': '5px', 'gap': '10px'});
            selectedOptions[category] = selectedOptions[category].filter(tag => tag.active || categories[category].some(cat => cat.name === tag.name));
            selectedOptions[category].forEach(tag => {
                createCheckbox(tag.name, category, checkboxContainer);
            });
            categoryContainer.append(checkboxContainer);

            // Add selected tags that are not in predefined categories
            categories[category].forEach(tag => {
                if (!selectedOptions[category].some(selectedTag => selectedTag.name === tag.name)) {
                    selectedOptions[category].push(tag);
                    createCheckbox(tag.name, category, checkboxContainer);
                }
            });

            // Create add tag input and button (initially hidden)
            const addTagContainer = $('<div class="add-tag-container"></div>').css({
                'display': 'none',
                'margin-top': '10px',
                'align-items': 'center'  // This ensures vertical alignment
            });
            const addTagInput = $('<input type="text">')
                .css({
                    'flex-grow': '1',
                    'padding': '5px',
                    'border-radius': '5px',
                    'border': '1px solid #333',
                    'margin-right': '10px'  // Add some space between input and button
                })
                .attr('placeholder', 'Add new ' + category.toLowerCase() + '...');
            const addTagButton = $('<button>Add</button>')
                .css({
                    'padding': '5px 10px',
                    'border-radius': '5px',
                    'border': 'none',
                    'cursor': 'pointer',
                    'background-color': '#333',
                    'color': '#fff',
                    'white-space': 'nowrap'  // Prevent button text from wrapping
                });
            
            const addNewTag = () => {
                const newTag = addTagInput.val().trim();
                if (newTag && !selectedOptions[category].some(tag => tag.name === newTag)) {
                    selectedOptions[category].push({ name: newTag, active: true });
                    createCheckbox(newTag, category, checkboxContainer);
                    addTagInput.val('');
                    saveSelectionsToLocalStorage();
                }
            };

            addTagButton.click(addNewTag);
            
            addTagInput.keypress(function(e) {
                if(e.which == 13) { // Enter key
                    e.preventDefault();
                    addNewTag();
                }
            });

            addTagContainer.append(addTagInput).append(addTagButton);
            categoryContainer.append(addTagContainer);

            // Modify the text area functionality
            const textArea = $('<textarea></textarea>')
                .css({'width': '100%', 'margin-top': '10px', 'border-radius': '5px', 'padding': '5px'})
                .attr('placeholder', 'Enter additional ' + category.toLowerCase() + ' here...');
            
            // Initialize textarea with custom tags not in checkboxes
            const checkboxTags = selectedOptions[category].map(tag => tag.name);
            const customTags = localStorage.getItem('customTags_' + category) || '';
            textArea.val(customTags);

            textArea.on('input', function() {
                const customTagsValue = $(this).val().trim();
                localStorage.setItem('customTags_' + category, customTagsValue);
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
                const combinedPrompt = generatePrompt();
                tagArea = document.querySelectorAll("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']")[0];
                tagArea.value = combinedPrompt;
                saveSelectionsToLocalStorage();
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
                saveSelectionsToLocalStorage();
                modalDiv.remove();
            });

        modalDiv.append(generateButton).append(cancelButton);
        $('body').append(modalDiv);
    }

    function createCheckbox(item, category, container) {
        const checkboxLabel = $('<label></label>').css({
            'color': '#333', 
            'display': 'flex', 
            'align-items': 'center', 
            'white-space': 'nowrap', 
            'margin-right': '10px'
        });
        const checkbox = $('<input type="checkbox">').val(item).css({'margin-right': '5px'});
        const tag = selectedOptions[category].find(tag => tag.name === item);
        checkbox.prop('checked', tag.active);
        checkbox.change(function() {
            tag.active = this.checked;
            saveSelectionsToLocalStorage();
        });

        // Create weight display
        const weightDisplay = $('<span class="weight-display"></span>').css({
            'font-size': '0.8em',
            'color': '#666',
        });

        // Create weight control
        const weightControl = $('<div class="weight-control"></div>').css({
            'display': 'none',
            'align-items': 'center',
            'margin-left': '5px'
        });
        const weightInput = $('<input type="number" step="0.05" min="0.5" max="1.5">')
            .css({
                'width': '40px',
                'margin': '0 5px'
            })
            .val(tag.weight || 1);
        const decreaseButton = $('<button>-</button>').css({'padding': '0 5px'});
        const increaseButton = $('<button>+</button>').css({'padding': '0 5px'});

        decreaseButton.click(() => updateWeight(-0.05));
        increaseButton.click(() => updateWeight(0.05));
        weightInput.on('input', () => {
            tag.weight = parseFloat(weightInput.val());
            updateWeightDisplay(tag, weightDisplay, weightControl);
            saveSelectionsToLocalStorage();
        });

        function updateWeight(change) {
            let newWeight = (tag.weight || 1) + change;
            newWeight = Math.round(newWeight * 20) / 20; // Round to nearest 0.05
            newWeight = Math.max(0.5, Math.min(1.5, newWeight)); // Clamp between 0.5 and 1.5
            tag.weight = newWeight;
            weightInput.val(newWeight);
            updateWeightDisplay(tag, weightDisplay, weightControl);
            saveSelectionsToLocalStorage();
        }

        weightControl.append(decreaseButton, weightInput, increaseButton);
        checkboxLabel.append(checkbox, item, weightDisplay, weightControl);

        const deleteButton = $('<button class="delete-button">×</button>').css({
            'margin-left': '5px',
            'padding': '2px 5px',
            'border-radius': '3px',
            'border': 'none',
            'cursor': 'pointer',
            'background-color': '#ff4d4d',
            'color': '#fff',
            'display': 'none'
        }).click(() => {
            selectedOptions[category] = selectedOptions[category].filter(t => t.name !== item);
            saveSelectionsToLocalStorage();
            checkboxLabel.remove();
        });

        checkboxLabel.append(deleteButton);
        container.append(checkboxLabel);

        updateWeightDisplay(tag, weightDisplay, weightControl);
    }

    function onReady() {
        setTimeout(placeComposerButton, 3000); // Add a delay of 3 seconds to ensure elements are loaded
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

    // Modify the generate prompt function
    function generatePrompt() {
        return Object.keys(selectedOptions).map(category => {
            const activeTags = selectedOptions[category]
                .filter(tag => tag.active)
                .map(tag => {
                    let tagText = tag.name;
                    if (tag.weight > 1) {
                        const repetitions = Math.round((tag.weight - 1) / 0.05);
                        tagText = '{'.repeat(repetitions) + tagText + '}'.repeat(repetitions);
                    } else if (tag.weight < 1) {
                        const repetitions = Math.round((1 - tag.weight) / 0.05);
                        tagText = '['.repeat(repetitions) + tagText + ']'.repeat(repetitions);
                    }
                    return tagText;
                });
            const customTags = (localStorage.getItem('customTags_' + category) || '')
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');
            return [...activeTags, ...customTags];
        }).flat().join(", ");
    }

    // Update this function to handle both the input, display, and control visibility
    function updateWeightDisplay(tag, displayElement, controlElement) {
        const weight = tag.weight || 1;
        if (weight === 1) {
            displayElement.text('');
            controlElement.hide();
        } else {
            if ($('.weight-control').first().is(':visible')) {
                displayElement.text('');
                controlElement.show();
            } else {
                displayElement.text(`:${weight.toFixed(2)}`);
                controlElement.hide();
            }
        }
    }

    $(onReady);
})();