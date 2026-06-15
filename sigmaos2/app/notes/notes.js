const storage = window.storageLib; 
const storageInstance = storage?.storageLib || storage; 

const note = document.getElementById('notes-textarea');

function saveNoteContent() {
    storageInstance.storeData('notes_data', note.value);
}

    note.addEventListener('input', () => {
        saveNoteContent();
    });

async function init() {
    try {        
        const savedContent = await storageInstance.getData('notes_data') || '';
        note.value = savedContent;
    } catch (err) {
        console.error("Error: ", err);
    }
}

init();