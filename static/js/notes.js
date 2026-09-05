const notesContainer =
    document.getElementById("notesContainer");

const noteEditor =
    document.getElementById("noteEditor");

const noteForm =
    document.getElementById("noteForm");

const noteId =
    document.getElementById("noteId");

const noteTitle =
    document.getElementById("noteTitle");

const noteContent =
    document.getElementById("noteContent");

const editorTitle =
    document.getElementById("editorTitle");

const emptyState =
    document.getElementById("emptyState");

const message =
    document.getElementById("message");


// ==========================================
// LOAD USER
// ==========================================

async function loadUser() {

    const response = await fetch("/api/me");

    const data = await response.json();

    if (!data.logged_in) {

        window.location.href = "/login";

        return;
    }

    document.getElementById("username")
        .textContent = data.username;
}


// ==========================================
// LOAD NOTES
// ==========================================

async function loadNotes() {

    try {

        const response =
            await fetch("/api/notes");

        if (response.status === 401) {

            window.location.href = "/login";

            return;
        }

        const notes =
            await response.json();


        notesContainer.innerHTML = "";


        if (notes.length === 0) {

            emptyState.style.display = "block";

            return;

        }


        emptyState.style.display = "none";


        notes.forEach(note => {

            createNoteCard(note);

        });

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to load notes.",
            "error"
        );

    }
}


// ==========================================
// CREATE NOTE CARD USING DOM
// ==========================================

function createNoteCard(note) {

    const card =
        document.createElement("article");

    card.className = "note-card";


    const header =
        document.createElement("div");

    header.className = "note-card-header";


    const title =
        document.createElement("h3");

    // textContent prevents HTML injection
    title.textContent = note.title;


    const actions =
        document.createElement("div");

    actions.className = "note-actions";


    const editButton =
        document.createElement("button");

    editButton.className = "edit-btn";

    editButton.textContent = "✏️";

    editButton.title = "Edit note";

    editButton.addEventListener(
        "click",
        () => editNote(note.id)
    );


    const deleteButton =
        document.createElement("button");

    deleteButton.className = "delete-btn";

    deleteButton.textContent = "🗑️";

    deleteButton.title = "Delete note";

    deleteButton.addEventListener(
        "click",
        () => deleteNote(note.id)
    );


    actions.appendChild(editButton);
    actions.appendChild(deleteButton);


    header.appendChild(title);
    header.appendChild(actions);


    const content =
        document.createElement("p");

    content.className =
        "note-content";

    content.textContent =
        note.content;


    const footer =
        document.createElement("div");

    footer.className =
        "note-footer";


    const date =
        document.createElement("span");

    date.textContent =
        formatDate(note.updated_at);


    footer.appendChild(date);


    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(footer);


    notesContainer.appendChild(card);
}


// ==========================================
// SHOW NEW NOTE FORM
// ==========================================

function showNewNoteForm() {

    noteEditor.classList.add("active");

    editorTitle.textContent =
        "Create New Note";

    noteForm.reset();

    noteId.value = "";

    noteTitle.focus();
}


// ==========================================
// CLOSE EDITOR
// ==========================================

function closeEditor() {

    noteEditor.classList.remove("active");

    noteForm.reset();

    noteId.value = "";

}


// ==========================================
// CREATE / UPDATE NOTE
// ==========================================

noteForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const id =
        noteId.value;

    const title =
        noteTitle.value.trim();

    const content =
        noteContent.value.trim();


    if (!title || !content) {

        showMessage(
            "Please fill in all fields.",
            "error"
        );

        return;
    }


    let url = "/api/notes";
    let method = "POST";


    // Update existing note
    if (id) {

        url = `/api/notes/${id}`;

        method = "PUT";

    }


    try {

        const response =
            await fetch(url, {

                method: method,

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    title: title,
                    content: content
                })

            });


        const data =
            await response.json();


        if (data.success) {

            showMessage(
                data.message,
                "success"
            );

            closeEditor();

            await loadNotes();

        } else {

            showMessage(
                data.message,
                "error"
            );

        }

    } catch (error) {

        console.error(error);

        showMessage(
            "Something went wrong.",
            "error"
        );

    }

});


// ==========================================
// EDIT NOTE
// ==========================================

async function editNote(id) {

    try {

        const response =
            await fetch(`/api/notes/${id}`);

        const note =
            await response.json();


        if (!response.ok) {

            showMessage(
                note.message,
                "error"
            );

            return;
        }


        noteId.value =
            note.id;

        noteTitle.value =
            note.title;

        noteContent.value =
            note.content;


        editorTitle.textContent =
            "Edit Note";


        noteEditor.classList.add("active");


        noteTitle.focus();

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to load note.",
            "error"
        );

    }

}


// ==========================================
// DELETE NOTE
// ==========================================

async function deleteNote(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this note?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(`/api/notes/${id}`, {

                method: "DELETE"

            });


        const data =
            await response.json();


        if (data.success) {

            showMessage(
                "Note deleted successfully.",
                "success"
            );

            await loadNotes();

        } else {

            showMessage(
                data.message,
                "error"
            );

        }

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to delete note.",
            "error"
        );

    }

}


// ==========================================
// LOGOUT
// ==========================================

document
    .getElementById("logoutBtn")
    .addEventListener("click", async function () {

        try {

            await fetch("/api/logout", {
                method: "POST"
            });

            window.location.href =
                "/login";

        } catch (error) {

            console.error(error);

        }

    });


// ==========================================
// BUTTON EVENTS
// ==========================================

document
    .getElementById("newNoteBtn")
    .addEventListener(
        "click",
        showNewNoteForm
    );


document
    .getElementById("emptyAddBtn")
    .addEventListener(
        "click",
        showNewNoteForm
    );


document
    .getElementById("closeEditorBtn")
    .addEventListener(
        "click",
        closeEditor
    );


document
    .getElementById("cancelBtn")
    .addEventListener(
        "click",
        closeEditor
    );


// ==========================================
// MESSAGE
// ==========================================

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        `dashboard-message ${type}`;


    setTimeout(() => {

        message.textContent = "";

        message.className =
            "dashboard-message";

    }, 3000);

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateString) {

    const date =
        new Date(dateString);

    return date.toLocaleString();

}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

loadUser();
loadNotes();
