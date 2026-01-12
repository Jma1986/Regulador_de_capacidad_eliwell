const fs = require('fs');
const paramsPath = './src/data/parameters.json';
const mappingPath = './src/data/io_mapping.json';

const params = require(paramsPath);
const mapping = require(mappingPath);

console.log('Updating parameters.json with valid options...');

// Helper to convert mapping object to options array
const getOptions = (mappingKey) => {
    const mapObj = mapping[mappingKey];
    if (!mapObj) {
        console.error(`Mapping key ${mappingKey} not found!`);
        return [];
    }
    return Object.keys(mapObj)
        .filter(k => k !== 'description' && !isNaN(parseInt(k))) // Filter out metadata
        .map(k => ({
            value: parseInt(k),
            label: k // Show only the number as label
        }));
};

// Helper to add/update parameter
const upsertParam = (id, label, folder, options) => {
    const existingIndex = params.findIndex(p => p.id === id);
    const newParam = {
        id: id,
        label: label,
        description: label,
        folder: folder,
        type: "enum",
        defaultValue: 0,
        options: options,
        accessLevel: "installer",
        sourcePage: 114 // Approximate page
    };

    if (existingIndex >= 0) {
        params[existingIndex] = { ...params[existingIndex], ...newParam }; // Merge/Overwrite
    } else {
        params.push(newParam);
    }
};

// 1. Digital Outputs (584-H201 to 590-H207)
const doOptions = getOptions('digital_outputs');
for (let i = 1; i <= 7; i++) {
    const id = `${583 + i}-H20${i}`;
    upsertParam(id, `Relé OUT${i}`, 'folder_resources_do', doOptions);
}

// 2. Digital Inputs (603-H101 to 608-H106)
// Using 'digital_inputs' mapping for all DIs
const diOptions = getOptions('digital_inputs');
for (let i = 1; i <= 6; i++) {
    const id = `${602 + i}-H10${i}`;
    upsertParam(id, `Entrada Digital H10${i}`, 'folder_resources_di', diOptions);
}

// 3. Analog Inputs Pressure (623-H401, 624-H402)
const aiPresOptions = getOptions('analog_inputs_pressure');
for (let i = 1; i <= 2; i++) {
    const id = `${622 + i}-H40${i}`;
    upsertParam(id, `Entrada Analógica PB${i}`, 'folder_resources_ai', aiPresOptions);
}

// 4. Analog Inputs Temp (627-H405 to 630-H408)
const aiTempOptions = getOptions('analog_inputs_temp');
for (let i = 5; i <= 8; i++) {
    const id = `${622 + i}-H40${i}`;
    upsertParam(id, `Entrada Analógica PB${i}`, 'folder_resources_ai', aiTempOptions);
}

// 5. Analog Outputs (631-H501, 632-H502)
const aoOptions = getOptions('analog_outputs');
for (let i = 1; i <= 2; i++) {
    const id = `${630 + i}-H50${i}`;
    upsertParam(id, `Salida Analógica ${i}`, 'folder_resources_ao', aoOptions);
}

fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2));
console.log('parameters.json updated with numeric options successfully');
