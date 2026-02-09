// Store all orders in this array
const orders = [];
let editingIndex = null;
let currentSummaryText = '';

// Language handling
let currentLang = 'en'; // Default language is English
let translationsEn = {}; // Fallback English
let translationsCurrent = {}; // Selected language

// Get references to DOM elements
const elements = {
    title: document.getElementById('pageTitle'),
    heading: document.getElementById('heading'),
    labelName: document.getElementById('labelName'),
    nameInput: document.getElementById('nameInput'),
    toppingsContainer: document.getElementById('toppingsContainer'),
    sizeSelect: document.getElementById('sizeSelect'),
    quantityInput: document.getElementById('quantityInput'),
    presetSelect: document.getElementById('presetSelect'),
    notesInput: document.getElementById('notesInput'),
    allergiesInput: document.getElementById('allergiesInput'),
    buttonNext: document.getElementById('buttonNext'),
    buttonFinish: document.getElementById('buttonFinish'),
    buttonCopy: document.getElementById('buttonCopy'),
    output: document.getElementById('output'),
    outputActions: document.getElementById('outputActions'),
    formContainer: document.getElementById('formContainer'),
    languageSelector: document.getElementById('languageSelector'),
    ordersListTitle: document.getElementById('ordersListTitle'),
    ordersList: document.getElementById('ordersList'),
    labelSize: document.getElementById('labelSize'),
    labelQuantity: document.getElementById('labelQuantity'),
    labelPreset: document.getElementById('labelPreset'),
    labelNotes: document.getElementById('labelNotes'),
    labelAllergies: document.getElementById('labelAllergies')
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    currentLang = elements.languageSelector.value;

    elements.languageSelector.addEventListener('change', e => {
        currentLang = e.target.value;
        loadTranslations();
    });

    loadTranslations();
});

// Load translations from JSON files
async function loadTranslations() {
    try {
        translationsEn = await fetch('locales/lang_en.json').then(r => r.json());

        if (currentLang === 'en') {
            translationsCurrent = translationsEn;
        } else {
            try {
                translationsCurrent = await fetch(`locales/lang_${currentLang}.json`).then(r => r.json());
            } catch {
                translationsCurrent = {};
            }
        }

        updateUI();
    } catch (e) {
        console.error('Error loading translations:', e);
    }
}

// Translation lookup helper
function t(key) {
    if (key in translationsCurrent && translationsCurrent[key]) {
        return translationsCurrent[key];
    }
    if (key in translationsEn && translationsEn[key]) {
        return translationsEn[key];
    }
    return key;
}

// Update all text and UI states
function updateUI() {
    elements.title.textContent = t('title');
    elements.heading.textContent = t('heading');
    elements.labelName.textContent = t('labelName');
    elements.nameInput.placeholder = t('namePlaceholder');
    elements.labelSize.textContent = t('labelSize');
    elements.labelQuantity.textContent = t('labelQuantity');
    elements.labelPreset.textContent = t('labelPreset');
    elements.labelNotes.textContent = t('labelNotes');
    elements.labelAllergies.textContent = t('labelAllergies');
    elements.notesInput.placeholder = t('notesPlaceholder');
    elements.allergiesInput.placeholder = t('allergiesPlaceholder');
    elements.buttonNext.textContent = t('buttonNext');
    elements.buttonFinish.textContent = t('buttonFinish');
    elements.buttonCopy.textContent = t('buttonCopy');
    elements.ordersListTitle.textContent = t('ordersListTitle');

    buildSizes(t('sizeOptions') || []);
    buildPresets(t('presetOptions') || []);
    buildToppings(t('ingredients') || []);

    elements.output.textContent = '';
    elements.outputActions.style.display = 'none';
    elements.formContainer.style.display = 'block';
    elements.output.style.fontSize = '1rem';
    resetForm();
    orders.length = 0;
    renderOrdersList();
}

function buildSizes(sizes) {
    const sizeOptions = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['S', 'M', 'L'];
    elements.sizeSelect.innerHTML = '';
    sizeOptions.forEach((size, index) => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        if (index === 1) {
            option.selected = true;
        }
        elements.sizeSelect.appendChild(option);
    });
}

function buildPresets(presets) {
    elements.presetSelect.innerHTML = '';
    const customOption = document.createElement('option');
    customOption.value = '__custom__';
    customOption.textContent = t('presetCustom');
    elements.presetSelect.appendChild(customOption);

    const presetList = Array.isArray(presets) ? presets : [];
    presetList.forEach((preset, index) => {
        if (!preset || !preset.name || !Array.isArray(preset.toppings)) {
            return;
        }
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = preset.name;
        elements.presetSelect.appendChild(option);
    });

    elements.presetSelect.onchange = () => {
        if (elements.presetSelect.value === '__custom__') {
            clearSelectedToppings();
            return;
        }
        const presetIndex = parseInt(elements.presetSelect.value, 10);
        const selectedPreset = presetList[presetIndex];
        if (selectedPreset) {
            setSelectedToppings(selectedPreset.toppings);
        }
    };
}

// Build interactive topping buttons
function buildToppings(toppings) {
    elements.toppingsContainer.innerHTML = '';
    toppings.forEach(topping => {
        const div = document.createElement('div');
        div.className = 'topping';
        div.dataset.topping = topping;
        div.textContent = topping;
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
        });
        elements.toppingsContainer.appendChild(div);
    });
}

function setSelectedToppings(toppings) {
    const selected = new Set(toppings);
    document.querySelectorAll('.topping').forEach(div => {
        if (selected.has(div.dataset.topping)) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });
}

function clearSelectedToppings() {
    document.querySelectorAll('.topping.selected').forEach(div => div.classList.remove('selected'));
}

// Saves one order and resets the form
function addOrder() {
    const name = elements.nameInput.value.trim();
    if (!name) {
        alert(t('alertNoName'));
        return;
    }

    const quantity = parseInt(elements.quantityInput.value, 10);
    if (!quantity || quantity < 1) {
        alert(t('alertNoQuantity'));
        return;
    }

    const size = elements.sizeSelect.value || '';
    const selectedToppings = Array.from(document.querySelectorAll('.topping.selected'))
        .map(div => div.dataset.topping);
    const notes = elements.notesInput.value.trim();
    const allergies = elements.allergiesInput.value.trim();

    const order = {
        name,
        size,
        quantity,
        toppings: selectedToppings,
        notes,
        allergies
    };

    if (editingIndex !== null) {
        orders[editingIndex] = order;
    } else {
        orders.push(order);
    }

    resetForm();
    renderOrdersList();
}

// Shows order summary and hides form
function finalizeOrders() {
    const name = elements.nameInput.value.trim();
    const selectedToppings = Array.from(document.querySelectorAll('.topping.selected'))
        .map(div => div.dataset.topping);

    const quantity = parseInt(elements.quantityInput.value, 10);
    const size = elements.sizeSelect.value || '';
    const notes = elements.notesInput.value.trim();
    const allergies = elements.allergiesInput.value.trim();

    if (name || selectedToppings.length > 0 || notes || allergies) {
        const order = {
            name: name || t('unknownName'),
            size,
            quantity: quantity > 0 ? quantity : 1,
            toppings: selectedToppings,
            notes,
            allergies
        };
        if (editingIndex !== null) {
            orders[editingIndex] = order;
        } else {
            orders.push(order);
        }
    }

    if (orders.length === 0) {
        alert(t('alertNoOrders'));
        return;
    }

    const ordersSorted = orders.slice().sort((a, b) => a.name.localeCompare(b.name));
    let text = t('summaryTitle') + "\n----------------------\n";
    text += t('summaryByPerson') + "\n";

    ordersSorted.forEach((entry, i) => {
        text += `${i + 1}. ${entry.name} ${t('wants')}:\n`;
        text += `   ${t('summaryQuantity')}: ${entry.quantity || 1}\n`;
        text += `   ${t('summarySize')}: ${entry.size || '-'}\n`;
        if (entry.toppings.length === 0) {
            text += "   " + t('summaryNoToppings') + "\n";
        } else {
            text += `   ${t('summaryToppings')}:\n`;
            entry.toppings.forEach(topping => {
                text += `   - ${topping}\n`;
            });
        }
        if (entry.notes) {
            text += `   ${t('summaryNotes')}: ${entry.notes}\n`;
        }
        if (entry.allergies) {
            text += `   ${t('summaryAllergies')}: ${entry.allergies}\n`;
        }
        text += '\n';
    });

    const groupedMap = new Map();
    orders.forEach(entry => {
        const toppingsKey = entry.toppings.slice().sort().join('|');
        const key = [entry.size, toppingsKey, entry.notes || '', entry.allergies || ''].join('::');
        const existing = groupedMap.get(key);
        if (existing) {
            existing.quantity += entry.quantity || 1;
        } else {
            groupedMap.set(key, {
                size: entry.size,
                toppings: entry.toppings.slice().sort(),
                notes: entry.notes,
                allergies: entry.allergies,
                quantity: entry.quantity || 1
            });
        }
    });

    text += t('summaryGrouped') + "\n";
    Array.from(groupedMap.values()).forEach(entry => {
        const toppingsText = entry.toppings.length > 0 ? entry.toppings.join(', ') : t('summaryNoToppings');
        text += `- ${entry.quantity}x (${t('summarySize')}: ${entry.size || '-'}) ${toppingsText}\n`;
        if (entry.notes) {
            text += `  ${t('summaryNotes')}: ${entry.notes}\n`;
        }
        if (entry.allergies) {
            text += `  ${t('summaryAllergies')}: ${entry.allergies}\n`;
        }
    });

    elements.output.textContent = text;
    elements.formContainer.style.display = 'none';
    elements.output.style.fontSize = '1.3rem';
    elements.outputActions.style.display = 'flex';
    currentSummaryText = text;

    resetForm();
}

function resetForm() {
    elements.nameInput.value = '';
    elements.quantityInput.value = '1';
    elements.notesInput.value = '';
    elements.allergiesInput.value = '';
    elements.presetSelect.value = '__custom__';
    if (elements.sizeSelect.options.length > 0) {
        elements.sizeSelect.selectedIndex = Math.min(1, elements.sizeSelect.options.length - 1);
    }
    clearSelectedToppings();
    editingIndex = null;
    elements.buttonNext.textContent = t('buttonNext');
}

function renderOrdersList() {
    elements.ordersList.innerHTML = '';
    orders.forEach((order, index) => {
        const item = document.createElement('div');
        item.className = 'order-item';

        const text = document.createElement('div');
        text.className = 'order-text';
        const toppingsText = order.toppings.length > 0 ? order.toppings.join(', ') : t('summaryNoToppings');
        text.textContent = `${order.name} • ${t('summaryQuantity')}: ${order.quantity || 1} • ${t('summarySize')}: ${order.size || '-'} • ${toppingsText}`;
        item.appendChild(text);

        const actions = document.createElement('div');
        actions.className = 'order-actions';

        const editBtn = document.createElement('button');
        editBtn.textContent = t('buttonEdit');
        editBtn.addEventListener('click', () => editOrder(index));
        actions.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = t('buttonRemove');
        removeBtn.addEventListener('click', () => removeOrder(index));
        actions.appendChild(removeBtn);

        item.appendChild(actions);
        elements.ordersList.appendChild(item);
    });
}

function editOrder(index) {
    const order = orders[index];
    if (!order) return;

    editingIndex = index;
    elements.nameInput.value = order.name;
    elements.quantityInput.value = String(order.quantity || 1);
    elements.sizeSelect.value = order.size || elements.sizeSelect.value;
    elements.notesInput.value = order.notes || '';
    elements.allergiesInput.value = order.allergies || '';
    elements.presetSelect.value = '__custom__';
    setSelectedToppings(order.toppings);
    elements.buttonNext.textContent = t('buttonUpdate');
}

function removeOrder(index) {
    orders.splice(index, 1);
    if (editingIndex === index) {
        resetForm();
    } else if (editingIndex !== null && index < editingIndex) {
        editingIndex -= 1;
    }
    renderOrdersList();
}

function copySummary() {
    if (!currentSummaryText) {
        alert(t('alertNoSummary'));
        return;
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        alert(t('alertNoClipboard'));
        return;
    }
    navigator.clipboard.writeText(currentSummaryText).then(() => {
        alert(t('alertCopied'));
    }).catch(() => {
        alert(t('alertNoClipboard'));
    });
}
