import React, { useState, useEffect } from "react";
import "./App.css";

/*
  Pure black and white palette for monochrome theme
*/
const PALETTE = {
  primary: "#000",
  secondary: "#000",
  accent: "#fff",
  danger: "#000",
  bg: "#fff",
  border: "#000"
};

// API endpoint (customize as needed)
const API_BASE = "/api"; // adjust base as needed for deployment

// Utils
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Tags/categories suggestions
const BASE_TAGS = [
  "Personal",
  "Work",
  "Todo",
  "Ideas",
  "Archive"
];

// PUBLIC_INTERFACE
function App() {
  // State
  const [notes, setNotes] = useState([]); // all notes
  const [filteredNotes, setFilteredNotes] = useState([]); // after search/filter
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [editingNote, setEditingNote] = useState(null); // note draft being edited/created
  const [search, setSearch] = useState("");
  const [sidebarTags, setSidebarTags] = useState(BASE_TAGS);
  const [activeTag, setActiveTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  // Filter on search/tag change
  useEffect(() => {
    filterNotes();
    // eslint-disable-next-line
  }, [notes, search, activeTag]);

  // Fetch all notes
  // PUBLIC_INTERFACE
  const fetchNotes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/notes`);
      if (!res.ok) throw new Error("Could not fetch notes");
      const data = await res.json();
      setNotes(data);
      // Gather unique tags from notes
      const tags = new Set(BASE_TAGS);
      data.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
      setSidebarTags(Array.from(tags));
    } catch (err) {
      setError("Failed to load notes.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE: Filter notes by search and tag
  const filterNotes = () => {
    let _notes = [...notes];
    if (activeTag) {
      _notes = _notes.filter(n => n.tags && n.tags.includes(activeTag));
    }
    if (search.trim().length > 0) {
      const query = search.toLowerCase();
      _notes = _notes.filter(
        n =>
          n.title.toLowerCase().includes(query) ||
          (n.content || "").toLowerCase().includes(query) ||
          (n.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }
    setFilteredNotes(_notes);
  };

  // PUBLIC_INTERFACE: Select a note for viewing
  const selectNote = (id) => {
    setSelectedNoteId(id);
    setEditingNote(null);
    setCreating(false);
  };

  // Start creating note
  // PUBLIC_INTERFACE
  const startCreate = () => {
    setEditingNote({
      id: null,
      title: "",
      content: "",
      tags: []
    });
    setSelectedNoteId(null);
    setCreating(true);
  };

  // PUBLIC_INTERFACE: Edit mode for a note
  const startEdit = (note) => {
    setEditingNote({ ...note });
    setCreating(false);
    setSelectedNoteId(note.id);
  };

  // PUBLIC_INTERFACE: Cancel edit/create
  const cancelEditing = () => {
    setEditingNote(null);
    setCreating(false);
  };

  // Handle changes to note draft form
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingNote((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle tag change for form (comma separated string)
  const handleTagInput = (e) => {
    const value = e.target.value;
    const tags = value
      .split(",")
      .map(t => t.trim())
      .filter(t => !!t);
    setEditingNote((prev) => ({ ...prev, tags }));
  };

  // PUBLIC_INTERFACE: Submit new or edited note
  const submitNote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editingNote.id) {
        // Update
        const res = await fetch(`${API_BASE}/notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingNote)
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        // Create
        const res = await fetch(`${API_BASE}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingNote)
        });
        if (!res.ok) throw new Error("Create failed");
      }
      await fetchNotes();
      setEditingNote(null);
      setCreating(false);
    } catch (err) {
      setError("Could not save note, check your input or try again.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE: Delete note
  const deleteNote = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this note? This cannot be undone.")
    ) {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/notes/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        await fetchNotes();
        if (selectedNoteId === id) setSelectedNoteId(null);
      } catch (err) {
        setError("Could not delete note.");
      }
      setLoading(false);
    }
  };

  // PUBLIC_INTERFACE: Search change (debounced)
  const doSetSearch = debounce((v) => setSearch(v), 150);

  // Render sidebar
  function Sidebar() {
    return (
      <aside className="sidebar">
        <div className="sidebar-section">
          <h3>Tags/Categories</h3>
          <div className="sidebar-tags">
            {sidebarTags.map((tag) => (
              <button
                className={tag === activeTag ? "sidebar-tag active" : "sidebar-tag"}
                style={{
                  background: tag === activeTag ? PALETTE.primary : "transparent",
                  color: tag === activeTag ? "#fff" : PALETTE.primary
                }}
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <hr />
        <button className="create-btn" onClick={startCreate} title="Create new note">
          ＋ New Note
        </button>
      </aside>
    );
  }

  // Render note list
  function NoteList() {
    if (loading)
      return (
        <div className="list-status">
          <span>Loading...</span>
        </div>
      );
    if (filteredNotes.length === 0)
      return (
        <div className="list-status">
          <span>No notes found.</span>
        </div>
      );
    return (
      <ul className="note-list">
        {filteredNotes.map((note) => (
          <li
            className={
              note.id === selectedNoteId ? "note-list-item active" : "note-list-item"
            }
            key={note.id}
            onClick={() => selectNote(note.id)}
          >
            <div className="note-title">
              {note.title || <em>(Untitled)</em>}
            </div>
            <div className="note-tags">
              {(note.tags || []).map((t) => (
                <span key={t} className="note-tag" style={{ background: PALETTE.accent, color: "#333" }}>{t}</span>
              ))}
            </div>
            <div className="note-short">
              {(note.content || "").slice(0, 36)}
              {note.content && note.content.length > 36 ? "…" : ""}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function NoteDetails() {
    if (!selectedNoteId) return <div className="note-details-empty">Select a note to view</div>;
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return <div className="note-details-empty">Note not found.</div>;
    return (
      <div className="note-details">
        <div className="note-details-header">
          <h2 style={{ margin: 0 }}>{note.title || <em>(Untitled)</em>}</h2>
          <div>
            <button className="small-btn" onClick={() => startEdit(note)} style={{color: PALETTE.primary}}>
              Edit
            </button>
            <button className="small-btn danger" onClick={() => deleteNote(note.id)}>
              Delete
            </button>
          </div>
        </div>
        <div className="note-tags" style={{ marginBottom: 16 }}>
          {(note.tags || []).map((t) => (
            <span key={t} className="note-tag" style={{ background: PALETTE.accent, color: "#333" }}>{t}</span>
          ))}
        </div>
        <div className="note-content">{note.content || <em>No content</em>}</div>
      </div>
    );
  }

  function NoteForm() {
    return (
      <form className="note-form" onSubmit={submitNote}>
        <h2>{editingNote.id ? "Edit Note" : "Create New Note"}</h2>
        <div className="form-field">
          <label htmlFor="title">Title:</label>
          <input
            name="title"
            id="title"
            value={editingNote.title}
            onChange={handleEditChange}
            placeholder="Note title"
            maxLength={120}
            required
            autoFocus
          />
        </div>
        <div className="form-field">
          <label htmlFor="content">Content:</label>
          <textarea
            name="content"
            id="content"
            value={editingNote.content}
            onChange={handleEditChange}
            rows={7}
            placeholder="Write your note here…"
            style={{ resize: "vertical" }}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="tags">Tags (comma-separated):</label>
          <input
            name="tags"
            id="tags"
            value={editingNote.tags.join(", ")}
            onChange={handleTagInput}
            placeholder="e.g. Personal, Work"
            autoComplete="off"
          />
        </div>
        <div className="form-buttons">
          <button type="submit" className="primary">
            {editingNote.id ? "Save Changes" : "Create Note"}
          </button>
          <button type="button" className="secondary" onClick={cancelEditing}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // Main app UI
  return (
    <div className="notes-app">
      <header className="topbar" style={{ background: PALETTE.primary }}>
        <div className="app-title">Notes</div>
        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search notes…"
            aria-label="Search notes"
            onChange={e => doSetSearch(e.target.value)}
          />
        </div>
      </header>
      <div className="main-body">
        <Sidebar />
        <main className="main-pane">
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {editingNote ? (
            <NoteForm />
          ) : creating ? (
            <NoteForm />
          ) : (
            <>
              <div className="note-list-container">
                <NoteList />
              </div>
              <div className="note-details-container">
                <NoteDetails />
              </div>
            </>
          )}
        </main>
      </div>
      <footer className="footer" style={{ borderTop: `1px solid ${PALETTE.border}` }}>
        <a href="https://kavia.ai" target="_blank" rel="noopener noreferrer" style={{ color: PALETTE.primary, textDecoration: "none", fontWeight: 500 }}>
          Powered by KAVIA
        </a>
      </footer>
    </div>
  );
}

export default App;
