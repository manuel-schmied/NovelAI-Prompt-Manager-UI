// ==UserScript==
// @name         Tag manager NAI
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  tag save loader for NovelAI Image gen
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

    const listDiv = $('<div></div>')
        .css({
            'position': 'fixed',
            'top': '50%',
            'left': '50%',
            'transform': 'translate(-50%, -50%)',
            'background-color': 'white',
            'padding': '20px',
            'border': '1px solid #333',
            'z-index': '9999999999'
        });

    labels.forEach(label => {
        const labelButton = $('<button></button>')
            .text(label)
            .css(btnLoadCss())
            .click(() => {
                tagArea = document.querySelector("[placeholder='Write your prompt here. Use tags to sculpt your outputs.']");
                tagArea.value = savedPrompts[label];
                listDiv.remove();
            });
        listDiv.append(labelButton).append('<br>');
    });

    const cancelButton = $('<button>Cancel</button>')
        .css(btnLoadCss())
        .click(() => {
            listDiv.remove();
        });

    listDiv.append(cancelButton);
    $('body').append(listDiv);
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
        'font-size': 'small'
    };
}

function placeButtons() {
    console.log('adding button');

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