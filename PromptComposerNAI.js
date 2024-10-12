// ==UserScript==
// @name         Prompt Composer NAI
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Helps compose a complete prompt for NovelAI Image generation, with customizable categories. Allows adding, removing, and reordering tags and categories with persistent selections saved in local storage.
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
        link.href = 'https://cdn.jsdelivr.net/gh/manuel-schmied/NovelAI-Prompt-Manager-UI@testbranch2/PromptComposerNAI.css';
        document.head.appendChild(link);
    }

    // Call the injectCSS function immediately
    injectCSS();

    let tagArea = null;
    let promptComposerData = JSON.parse(localStorage.getItem('promptComposerData')) || {
        categories: [
            {name: "Artists", tags: []},
            {name: "Participants", tags: []},
            {name: "Backgrounds", tags: []},
            {name: "Emotions", tags: []}
        ],
        customTags: {}
    };

    function saveToLocalStorage() {
        localStorage.setItem('promptComposerData', JSON.stringify(promptComposerData));
    }

    let modalDiv; // Declare modalDiv in the global scope
    let categoriesContainer;

    function renderCategories() {
        categoriesContainer.empty();
        promptComposerData.categories.forEach((category, index) => {
            createCategorySection(category, index, categoriesContainer);
        });
    }

    function openPromptComposer() {
        console.log("openPromptComposer called");
        try {
            $('#promptComposerModal').remove();

            modalDiv = $('<div id="promptComposerModal"></div>').addClass('prompt-composer-modal');
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
                $('.move-category-button, .delete-category-button').toggle();
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
                    if (newCategory && !promptComposerData.categories.some(cat => cat.name === newCategory)) {
                        promptComposerData.categories.push({name: newCategory, tags: []});
                        saveToLocalStorage();
                        addCategoryInput.val('');
                        renderCategories();
                    }
                });
            addCategoryContainer.append(addCategoryInput, addCategoryButton);
            categoryManagement.append(addCategoryContainer);
            modalDiv.append(categoryManagement);

            // Create a container for categories
            categoriesContainer = $('<div></div>').addClass('categories-container');
            modalDiv.append(categoryManagement);
            modalDiv.append(categoriesContainer);

            renderCategories();

            // Create a container for the bottom buttons
            const bottomButtonsContainer = $('<div></div>').addClass('bottom-buttons-container');

            const generateButton = $('<button>Generate Prompt</button>').addClass('generate-button')
                .click(() => {
                    const combinedPrompt = generatePrompt();
                    tagArea = document.querySelectorAll("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']")[0];
                    tagArea.value = combinedPrompt;
                    saveToLocalStorage();
                    modalDiv.remove();
                });

            const cancelButton = $('<button>Close</button>').addClass('close-button')
                .click(() => {
                    saveToLocalStorage();
                    modalDiv.remove();
                });

            bottomButtonsContainer.append(generateButton, cancelButton);
            modalDiv.append(bottomButtonsContainer);

            $('body').append(modalDiv);
            
            // Adjust layout based on screen size
            adjustLayout();
            
            $(window).on('resize', adjustLayout);
            
            console.log("Modal appended to body");
        } catch (error) {
            console.error("Error in openPromptComposer:", error);
        }
    }

    function adjustLayout() {
        if ($(window).width() >= 1200) {
            $('.category-container').css('width', '48%');
            modalDiv.css('width', '1000px');
        } else {
            $('.category-container').css('width', '100%');
            modalDiv.css('width', '600px');
        }
    }

    function createCategorySection(category, index, modalDiv) {
        const categoryContainer = $('<div></div>').addClass('category-container');
        const categoryHeader = $('<div></div>').addClass('category-header');
        const label = $('<label></label>').text(category.name + ':').addClass('category-label');
        
        const deleteCategoryButton = $('<button>Delete Category</button>')
            .addClass('delete-category-button')
            .hide() // Initially hide the delete button
            .click(() => {
                if (confirm(`Are you sure you want to delete the category "${category.name}" and all its tags?`)) {
                    promptComposerData.categories.splice(index, 1);
                    saveToLocalStorage();
                    renderCategories();
                }
            });
        
        const moveCategoryUpButton = $('<button>↑</button>').addClass('move-category-button')
            .hide() // Initially hide the move up button
            .click(() => {
                if (index > 0) {
                    [promptComposerData.categories[index - 1], promptComposerData.categories[index]] = 
                    [promptComposerData.categories[index], promptComposerData.categories[index - 1]];
                    saveToLocalStorage();
                    renderCategories();
                }
            });
        
        const moveCategoryDownButton = $('<button>↓</button>').addClass('move-category-button')
            .hide() // Initially hide the move down button
            .click(() => {
                if (index < promptComposerData.categories.length - 1) {
                    [promptComposerData.categories[index], promptComposerData.categories[index + 1]] = 
                    [promptComposerData.categories[index + 1], promptComposerData.categories[index]];
                    saveToLocalStorage();
                    renderCategories();
                }
            });
        
        const categoryManagementButtons = $('<div></div>').addClass('category-management-buttons');
        categoryManagementButtons.append(moveCategoryUpButton, moveCategoryDownButton, deleteCategoryButton);
        
        categoryHeader.append(label, categoryManagementButtons);
        categoryContainer.append(categoryHeader);

        const checkboxContainer = $('<div></div>').addClass('checkbox-container');
        category.tags.forEach(tag => {
            createCheckbox(tag, category.name, checkboxContainer);
        });
        categoryContainer.append(checkboxContainer);

        const addTagContainer = $('<div></div>').addClass('add-tag-container');
        const addTagInput = $('<input type="text">').addClass('add-tag-input')
            .attr('placeholder', 'Add new ' + category.name.toLowerCase() + '...');
        const addTagButton = $('<button>Add</button>').addClass('add-tag-button');
        
        const addNewTag = () => {
            const newTag = addTagInput.val().trim();
            if (newTag && !category.tags.some(tag => tag.name === newTag)) {
                category.tags.push({ name: newTag, active: true, weight: 1 });
                createCheckbox({ name: newTag, active: true, weight: 1 }, category.name, checkboxContainer);
                addTagInput.val('');
                saveToLocalStorage();
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
            .attr('placeholder', 'Enter additional ' + category.name.toLowerCase() + ' here...');
        
        const customTags = promptComposerData.customTags[category.name] || '';
        textArea.val(customTags);

        textArea.on('input', function() {
            const customTagsValue = $(this).val().trim();
            promptComposerData.customTags[category.name] = customTagsValue;
            saveToLocalStorage();
        });

        categoryContainer.append(textArea);
        categoriesContainer.append(categoryContainer);
    }

    function createCheckbox(tag, categoryName, container) {
        const checkboxLabel = $('<label></label>').addClass('checkbox-label');
        const checkbox = $('<input type="checkbox">').addClass('checkbox-input').val(tag.name);
        checkbox.prop('checked', tag.active);
        checkbox.change(function() {
            tag.active = this.checked;
            saveToLocalStorage();
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
            saveToLocalStorage();
        });

        function updateWeight(change) {
            let newWeight = (tag.weight || 1) + change;
            newWeight = Math.round(newWeight * 20) / 20; // Round to nearest 0.05
            newWeight = Math.max(0.5, Math.min(1.5, newWeight)); // Clamp between 0.5 and 1.5
            tag.weight = newWeight;
            weightInput.val(newWeight);
            updateWeightDisplay(tag, weightDisplay, weightControl);
            saveToLocalStorage();
        }

        weightControl.append(decreaseButton, weightInput, increaseButton);
        checkboxLabel.append(checkbox, tag.name, weightDisplay, weightControl);

        const deleteButton = $('<button>×</button>').addClass('delete-button').click(() => {
            const category = promptComposerData.categories.find(cat => cat.name === categoryName);
            category.tags = category.tags.filter(t => t.name !== tag.name);
            saveToLocalStorage();
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

    function generatePrompt() {
        return promptComposerData.categories.map(category => {
            const activeTags = category.tags
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
            const customTags = (promptComposerData.customTags[category.name] || '')
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');
            return [...activeTags, ...customTags];
        }).flat().join(", ");
    }

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