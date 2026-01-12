const fs = require('fs');
const path = './src/data/menus.json';
const menus = require(path);

// Log initial state
console.log('Fixing menus.json...');

// Remove existing conflicting nodes
delete menus.nodes['folder_resources'];
delete menus.nodes['folder_resources_do'];
delete menus.nodes['folder_resources_di'];
delete menus.nodes['folder_resources_ai'];
delete menus.nodes['folder_resources_ao'];

// Re-add them with correct structure (H201 series for 8900)
menus.nodes['folder_resources'] = {
    "id": "folder_resources",
    "label": "Asignación de recursos",
    "type": "folder",
    "children": [
        "folder_resources_do",
        "folder_resources_di",
        "folder_resources_ai",
        "folder_resources_ao"
    ]
};

menus.nodes['folder_resources_do'] = {
    "id": "folder_resources_do",
    "label": "Salidas digitales",
    "type": "folder",
    "wizard": true,
    "children": [
        "584-H201", "585-H202", "586-H203", "587-H204", "588-H205", "589-H206", "590-H207"
    ]
};

menus.nodes['folder_resources_di'] = {
    "id": "folder_resources_di",
    "label": "Entradas digitales",
    "type": "folder",
    "wizard": true,
    "children": [
        "603-H101", "604-H102", "605-H103", "606-H104", "607-H105", "608-H106"
    ]
};

menus.nodes['folder_resources_ai'] = {
    "id": "folder_resources_ai",
    "label": "Entradas analógicas",
    "type": "folder",
    "wizard": true,
    "children": [
        "623-H401", "624-H402",
        "627-H405", "628-H406", "629-H407", "630-H408"
    ]
};

menus.nodes['folder_resources_ao'] = {
    "id": "folder_resources_ao",
    "label": "Salidas analógicas",
    "type": "folder",
    "wizard": true,
    "children": [
        "631-H501", "632-H502"
    ]
};

// Also ensure param_installer has folder_resources in its children
const installer = menus.nodes['param_installer'];
if (installer && installer.children) {
    if (!installer.children.includes('folder_resources')) {
        installer.children.push('folder_resources');
    }
}

fs.writeFileSync(path, JSON.stringify(menus, null, 2));
console.log('Fixed menus.json structure');
