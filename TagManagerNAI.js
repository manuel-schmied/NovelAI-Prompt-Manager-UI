// ==UserScript==
// @name         Tag manager NAI
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  tag save loader for NovelAI Image gen with improved UI and accordion preview
// @author       sllypper, me
// @license      MIT
// @match        http*://novelai.net/image
// @icon         https://www.google.com/s2/favicons?sz=64&domain=novelai.net
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

let savedPrompts;
try {
    savedPrompts = JSON.parse(localStorage.getItem('savedPrompts')) || {};
} catch (e) {
    console.error("Error parsing saved prompts from localStorage:", e);
    savedPrompts = {};
}
let tagArea = null;

function saveTags() {
    tagArea = document.querySelector("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']");
    const label = prompt("Enter a label to save these tags:");
    if (label) {
        savedPrompts[label] = tagArea.value;
        localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
    } else {
        alert("Label is required to save tags.");
    }
}

function restoreTags() {
    const labels = Object.keys(savedPrompts);
    if (labels.length === 0) {
        alert("No saved tags available.");
        return;
    }

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
            'max-height': '70%',
            'overflow-y': 'auto'
        });

    const title = $('<h3>Manage Saved Tags</h3>').css({'text-align': 'center', 'margin-bottom': '20px', 'color': '#333'});
    modalDiv.append(title);

    labels.forEach(label => {
        const labelContainer = $('<div></div>').css({
            'margin-bottom': '10px',
            'padding': '10px',
            'border': '1px solid #ddd',
            'border-radius': '5px'
        });
        
        const labelHeader = $('<div></div>').css({
            'display': 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
        });
        
        const labelName = $('<strong></strong>').text(label).css({'color': '#333'});
        const previewButton = $('<button>Toggle Preview</button>')
            .css($.extend({}, btnLoadCss(), {'margin-left': '10px'}))
            .click(() => {
                previewDiv.toggle();
            });
        
        labelHeader.append(labelName).append(previewButton);

        const previewDiv = $('<div></div>').css({
            'display': 'none',
            'margin-top': '10px',
            'padding': '10px',
            'background-color': '#f0f0f0',
            'border-radius': '5px',
            'color': '#333'
        }).text(savedPrompts[label]);

        const buttonGroup = $('<div></div>').css({'display': 'flex', 'gap': '5px', 'margin-top': '10px'});
        
        const loadButton = $('<button>Load</button>')
            .css(btnLoadCss())
            .click(() => {
                tagArea = document.querySelector("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']");
                tagArea.value = savedPrompts[label];
                modalDiv.remove();
            });
        
        const editButton = $('<button>Edit</button>')
            .css(btnLoadCss())
            .click(() => {
                const newTags = prompt("Edit tags for label: " + label, savedPrompts[label]);
                if (newTags !== null) {
                    savedPrompts[label] = newTags;
                    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
                    labelName.text(label);
                    previewDiv.text(newTags);
                }
            });

        const deleteButton = $('<button>Delete</button>')
            .css($.extend({}, btnLoadCss(), {'background-color': '#ff6666', 'color': 'white'}))
            .click(() => {
                if (confirm("Are you sure you want to delete the tags for label: " + label + "?")) {
                    delete savedPrompts[label];
                    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
                    labelContainer.remove();
                }
            });

        buttonGroup.append(loadButton).append(editButton).append(deleteButton);
        labelContainer.append(labelHeader).append(previewDiv).append(buttonGroup);
        modalDiv.append(labelContainer);
    });

    const cancelButton = $('<button>Close</button>')
        .css($.extend({}, btnLoadCss(), {'margin-top': '20px', 'width': '100%'}))
        .click(() => {
            modalDiv.remove();
        });

    modalDiv.append(cancelButton);
    $('body').append(modalDiv);
}

function onReady() {
    placeButtons();
}

function createButton(text, action, styleObj) {
    return $('<button>')
        .text(text)
        .click(action)
        .css(styleObj);
};

function btnLoadCss() {
    return {
        'color': '#333',
        'background-color': 'rgb(246, 245, 244)',
        'font-size': 'small',
        'padding': '5px 10px',
        'border': 'none',
        'border-radius': '5px',
        'cursor': 'pointer'
    };
}

function placeButtons() {
    let div = $('<div></div>')
        .css({
            'display': 'flex',
            'gap': '4px',
            'position': 'fixed',
            'top': 0,
            'right': 0,
            'margin': '10px 150px 0 0',
            'color': '#333',
            'z-index': '9999999999'
        });

    let btnCSS = btnLoadCss();

    let save = createButton('Save', saveTags, btnCSS);
    let load = createButton('Load', restoreTags, btnCSS);

    let tagsText = $('<span>Tags</span>')
        .css({
            'font-size': 'xx-small',
            'color': 'white',
            'position': 'absolute',
            'top': '0',
            'left': '-22px'
        });

    tagsText.appendTo(div);
    save.appendTo(div);
    load.appendTo(div);

    $('body').append(div);
}

$(onReady);