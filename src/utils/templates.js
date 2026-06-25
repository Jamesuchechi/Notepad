const templates = [
  {
    id: 'blank',
    category: 'Blank',
    title: 'Blank note',
    description: 'Start with a clean slate and write whatever you need.',
    content: '<p></p>',
  },
  {
    id: 'journal',
    category: 'Journal',
    title: 'Daily journal',
    description: 'A simple journal layout for daily reflection and highlights.',
    content: `<h1>Daily Journal</h1>
<p><strong>Today I am grateful for:</strong></p>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>
<p><strong>Top priorities:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>
<p><strong>Notes:</strong></p>
<p></p>`,
  },
  {
    id: 'meeting',
    category: 'Meeting',
    title: 'Meeting notes',
    description: 'Capture agenda, decisions, and follow-up items in one place.',
    content: `<h1>Meeting notes</h1>
<p><strong>Date:</strong> </p>
<p><strong>Attendees:</strong></p>
<ul>
  <li></li>
</ul>
<h2>Agenda</h2>
<ul>
  <li></li>
</ul>
<h2>Notes</h2>
<p></p>
<h2>Action items</h2>
<ul>
  <li>[ ] </li>
</ul>`,
  },
  {
    id: 'todo',
    category: 'Todo',
    title: 'Task list',
    description: 'Set up a quick task list with priorities and progress.',
    content: `<h1>Todo</h1>
<ul>
  <li>[ ] </li>
  <li>[ ] </li>
  <li>[ ] </li>
</ul>
<p><strong>Notes:</strong></p>
<p></p>`,
  },
];

export default templates;
