const fs = require('fs');
const path = './src/data/menus.json';
const menus = require(path);

const nodes = menus.nodes;

// Helper to add param
const addParam = (id, label) => {
    nodes[id] = {
        id: id,
        label: label,
        type: "parameter_link",
        parameterId: id
    };
};

// DO: 584-H201 to 590-H207 (7 items)
// IDs from manual/io_mapping: H201 is 584
for (let i = 1; i <= 7; i++) {
    const numId = 583 + i;
    const hId = `H20${i}`;
    const fullId = `${numId}-${hId}`;
    addParam(fullId, `Relé OUT${i}`);
}

// DI HV: 603-H101 to 608-H106 (6 items)
for (let i = 1; i <= 6; i++) {
    const numId = 602 + i;
    const hId = `H10${i}`;
    const fullId = `${numId}-${hId}`;
    addParam(fullId, `Entrada Digital H10${i}`);
}

// AI Pressure: 623-H401 to 624-H402 (2 items)
// PB3 (625) is excluded for 8900
for (let i = 1; i <= 2; i++) {
    const numId = 622 + i;
    const hId = `H40${i}`;
    const fullId = `${numId}-${hId}`;
    addParam(fullId, `Entrada Analógica PB${i}`);
}

// AI Temp: 627-H405 to 630-H408 (4 items)
for (let i = 5; i <= 8; i++) {
    const numId = 622 + i;
    const hId = `H40${i}`;
    const fullId = `${numId}-${hId}`;
    addParam(fullId, `Entrada Analógica PB${i}`);
}

// AO: 631-H501 to 632-H502 (2 items)
for (let i = 1; i <= 2; i++) {
    const numId = 630 + i;
    const hId = `H50${i}`;
    const fullId = `${numId}-${hId}`;
    addParam(fullId, `Salida Analógica ${i}`);
}

fs.writeFileSync(path, JSON.stringify(menus, null, 2));
console.log('8900 Parameters added successfully');
