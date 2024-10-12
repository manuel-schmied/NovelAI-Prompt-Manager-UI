// ==UserScript==
// @name         Prompt Composer NAI
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Helps compose a complete prompt for NovelAI Image generation, with customizable categories. Allows adding and removing tags and categories with persistent selections saved in local storage.
// @author       Manu
// @license      MIT
// @match        http*://novelai.net/image
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

(function() {
    'use strict';

    // Function to inject CSS
    function injectCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/gh/manuel-schmied/NovelAI-Prompt-Manager-UI@master/PromptComposerNAI.css';
        document.head.appendChild(link);
    }

    // Call the injectCSS function immediately
    injectCSS();

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
        console.log("openPromptComposer called");
        try {
            $('#promptComposerModal').remove();

            const modalDiv = $('<div id="promptComposerModal"></div>').addClass('prompt-composer-modal');
            const title = $('<h3>Prompt Composer</h3>').addClass('prompt-composer-title');
            modalDiv.append(title);

            const buttonContainer = $('<div></div>').addClass('button-container');
            const editButton = $('<button>Edit Tags</button>').addClass('toggle-button').click(() => {
                $('.add-tag-container, .delete-button').toggle();
                $('.add-tag-container:visible').css('display', 'flex');
            });
            const weightToggleButton = $('<button>Toggle Weights</button>').addClass('toggle-button').click(() => {
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
            const categoryManagementButton = $('<button>Manage Categories</button>').addClass('toggle-button').click(() => {
                $('.category-management').toggle();
            });
            buttonContainer.append(editButton, weightToggleButton, categoryManagementButton);
            modalDiv.append(buttonContainer);

            // Add category management (initially hidden)
            const categoryManagement = $('<div></div>').addClass('category-management').hide();
            const addCategoryContainer = $('<div></div>').addClass('add-category-container');
            const addCategoryInput = $('<input type="text">').addClass('add-category-input')
                .attr('placeholder', 'Add new category...');
            const addCategoryButton = $('<button>Add Category</button>').addClass('add-category-button')
                .click(() => {
                    const newCategory = addCategoryInput.val().trim();
                    if (newCategory && !selectedOptions.hasOwnProperty(newCategory)) {
                        selectedOptions[newCategory] = [];
                        saveSelectionsToLocalStorage();
                        addCategoryInput.val('');
                        renderCategories();
                    }
                });
            addCategoryContainer.append(addCategoryInput, addCategoryButton);
            categoryManagement.append(addCategoryContainer);
            modalDiv.append(categoryManagement);

            function renderCategories() {
                $('.category-container').remove();
                for (let category in selectedOptions) {
                    createCategorySection(category, modalDiv);
                }
            }

            renderCategories();

            const generateButton = $('<button>Generate Prompt</button>').addClass('generate-button')
                .click(() => {
                    const combinedPrompt = generatePrompt();
                    tagArea = document.querySelectorAll("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']")[0];
                    tagArea.value = combinedPrompt;
                    saveSelectionsToLocalStorage();
                    modalDiv.remove();
                });

            const cancelButton = $('<button>Close</button>').addClass('close-button')
                .click(() => {
                    saveSelectionsToLocalStorage();
                    modalDiv.remove();
                });

            modalDiv.append(generateButton, cancelButton);
            $('body').append(modalDiv);
            console.log("Modal appended to body");
        } catch (error) {
            console.error("Error in openPromptComposer:", error);
        }
    }

    function createCategorySection(category, modalDiv) {
        const categoryContainer = $('<div></div>').addClass('category-container');
        const categoryHeader = $('<div></div>').addClass('category-header');
        const label = $('<label></label>').text(category + ':').addClass('category-label');
        const deleteCategoryButton = $('<button>×</button>').addClass('delete-category-button')
            .click(() => {
                delete selectedOptions[category];
                saveSelectionsToLocalStorage();
                categoryContainer.remove();
            });
        categoryHeader.append(label, deleteCategoryButton);
        categoryContainer.append(categoryHeader);

        const checkboxContainer = $('<div></div>').addClass('checkbox-container');
        selectedOptions[category].forEach(tag => {
            createCheckbox(tag.name, category, checkboxContainer);
        });
        categoryContainer.append(checkboxContainer);

        const addTagContainer = $('<div></div>').addClass('add-tag-container');
        const addTagInput = $('<input type="text">').addClass('add-tag-input')
            .attr('placeholder', 'Add new ' + category.toLowerCase() + '...');
        const addTagButton = $('<button>Add</button>').addClass('add-tag-button');
        
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
            if(e.which == 13) {
                e.preventDefault();
                addNewTag();
            }
        });

        addTagContainer.append(addTagInput, addTagButton);
        categoryContainer.append(addTagContainer);

        const textArea = $('<textarea></textarea>').addClass('tag-textarea')
            .attr('placeholder', 'Enter additional ' + category.toLowerCase() + ' here...');
        
        const customTags = localStorage.getItem('customTags_' + category) || '';
        textArea.val(customTags);

        textArea.on('input', function() {
            const customTagsValue = $(this).val().trim();
            localStorage.setItem('customTags_' + category, customTagsValue);
        });

        categoryContainer.append(textArea);
        modalDiv.append(categoryContainer);
    }

    function createCheckbox(item, category, container) {
        const checkboxLabel = $('<label></label>').addClass('checkbox-label');
        const checkbox = $('<input type="checkbox">').addClass('checkbox-input').val(item);
        const tag = selectedOptions[category].find(tag => tag.name === item);
        checkbox.prop('checked', tag.active);
        checkbox.change(function() {
            tag.active = this.checked;
            saveSelectionsToLocalStorage();
        });

        // Create weight display
        const weightDisplay = $('<span></span>').addClass('weight-display');

        // Create weight control
        const weightControl = $('<div></div>').addClass('weight-control');
        const weightInput = $('<input type="number" step="0.05" min="0.5" max="1.5">').addClass('weight-input')
            .val(tag.weight || 1);
        const decreaseButton = $('<button>-</button>').addClass('weight-button');
        const increaseButton = $('<button>+</button>').addClass('weight-button');

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
        setTimeout(placeComposerButton, 3000);
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
            if (controlElement) {
                controlElement.find('input').hide();
                controlElement.find('button').show();
            }
        } else {
            if (controlElement && $('.weight-control').first().is(':visible')) {
                displayElement.text('');
                controlElement.find('input, button').show();
            } else {
                displayElement.text(`:${weight.toFixed(2)}`);
                if (controlElement) {
                    controlElement.find('input').hide();
                    controlElement.find('button').show();
                }
            }
        }
    }

    $(onReady);
})();
