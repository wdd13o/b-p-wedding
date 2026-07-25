// Countdown Timer
function updateCountdown() {
    const monthsEl = document.getElementById('months');
    const weeksEl = document.getElementById('weeks');
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!monthsEl || !weeksEl || !daysEl || !hoursEl || !minutesEl || !secondsEl) {
        return;
    }

    const eventDate = new Date('2026-12-26T00:00:00');
    const now = new Date();
    let diff = eventDate - now;
    if (diff < 0) diff = 0;

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor((diff / (1000 * 60 * 60 * 24)) % 7);
    const weeks = Math.floor((diff / (1000 * 60 * 60 * 24 * 7)) % 4);
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));

    monthsEl.textContent = months;
    weeksEl.textContent = weeks;
    daysEl.textContent = days;
    hoursEl.textContent = hours;
    minutesEl.textContent = minutes;
    secondsEl.textContent = seconds;
}

if (document.getElementById('months')) {
    setInterval(updateCountdown, 1000);
    updateCountdown();
}

// Envelope Seal Click
const seal = document.getElementById('seal');
if (seal) {
    seal.addEventListener('click', function() {
        window.location.href = 'invitation.html';
    });
}

const rsvpForm = document.getElementById('rsvp-form');
const rsvpMessage = document.getElementById('rsvp-message');
if (rsvpForm) {
    rsvpForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(rsvpForm);
        const name = formData.get('name').trim();
        const phone = formData.get('phone').trim();
        const attendance = formData.get('attendance');
        const partyRole = formData.get('partyRole');
        const talent = formData.get('talent');

        if (!name || !phone || !attendance || !partyRole) {
            rsvpMessage.textContent = 'Please complete your name, phone number, party affiliation, and attendance response.';
            rsvpMessage.className = 'rsvp-message error';
            return;
        }

        rsvpMessage.textContent = 'Thank you! Your RSVP has been received.';
        rsvpMessage.className = 'rsvp-message success';

        saveRsvpEntry({
            name,
            phone,
            attendance,
            guests: formData.get('guests') || '0',
            partyRole,
            song: formData.get('song') || '',
            talent: talent || '',
            submittedAt: new Date().toISOString()
        });

        rsvpForm.reset();
    });
}

function getRsvpEntries() {
    try {
        const stored = localStorage.getItem('weddingRsvps');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to parse RSVP entries', error);
        return [];
    }
}

function saveRsvpEntry(entry) {
    const entries = getRsvpEntries();
    entries.push(entry);
    localStorage.setItem('weddingRsvps', JSON.stringify(entries));
}

function clearRsvpEntries() {
    localStorage.removeItem('weddingRsvps');
}

function exportRsvpsToCsv(entries) {
    const headings = ['Date', 'Name', 'Phone', 'Attendance', 'Guests', 'Affiliation', 'Song Request', 'Talent'];
    const rows = entries.map(e => [
        new Date(e.submittedAt).toLocaleString(),
        e.name,
        e.phone,
        e.attendance,
        e.guests,
        e.partyRole,
        e.song,
        e.talent || ''
    ]);

    const csvContent = [headings, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rsvp-entries.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function sortEntries(entries, key, order = 'asc') {
    return [...entries].sort((a, b) => {
        if (!a[key] || !b[key]) return 0;
        let comparison;
        if (key === 'submittedAt') {
            comparison = new Date(a[key]) - new Date(b[key]);
        } else {
            comparison = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true, sensitivity: 'base' });
        }
        return order === 'desc' ? -comparison : comparison;
    });
}

function renderAdminTable(entries) {
    const tableBody = document.getElementById('admin-table-body');
    const count = document.getElementById('entry-count');
    if (!tableBody || !count) return;

    tableBody.innerHTML = '';
    entries.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(entry.submittedAt).toLocaleString()}</td>
            <td>${entry.name}</td>
            <td>${entry.phone}</td>
            <td>${entry.attendance}</td>
            <td>${entry.guests}</td>
            <td>${entry.partyRole}</td>
            <td>${entry.song}</td>
            <td>${entry.talent || ''}</td>
        `;
        tableBody.appendChild(row);
    });
    count.textContent = entries.length;
}

function setupAdminPage() {
    const adminContent = document.getElementById('admin-content');
    const warning = document.getElementById('admin-warning');
    if (!adminContent || !warning) return;

    // Basic secret URL check
    const allowedKey = 'admin123';
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key') || window.location.hash.replace(/^#/, '');
    if (key !== allowedKey) {
        adminContent.style.display = 'none';
        warning.textContent = 'Admin access requires the secret URL key.';
        warning.className = 'admin-warning error';
        return;
    }

    warning.textContent = 'Admin access granted. Refresh if you submit new entries.';
    warning.className = 'admin-warning success';

    const entries = sortEntries(getRsvpEntries(), 'submittedAt');
    renderAdminTable(entries);

    if (entries.length === 0) {
        const originNote = window.location.protocol === 'file:'
            ? 'Because you are using file://, your browser may isolate localStorage per file. Use a local server for the RSVP data to appear in admin.'
            : 'No RSVP entries found yet. Submit the RSVP form and refresh this page to see them.';
        warning.textContent = `${warning.textContent} ${originNote}`;
    }

    const refreshBtn = document.getElementById('refresh-entries');
    const downloadBtn = document.getElementById('download-csv');
    const printBtn = document.getElementById('print-list');
    const affiliationSort = document.getElementById('affiliation-sort');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            renderAdminTable(sortEntries(getRsvpEntries(), 'submittedAt', 'desc'));
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            exportRsvpsToCsv(getRsvpEntries());
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (affiliationSort) {
        affiliationSort.addEventListener('change', () => {
            const selected = affiliationSort.value;
            const entries = getRsvpEntries();
            if (!selected) {
                renderAdminTable(sortEntries(entries, 'submittedAt', 'desc'));
                return;
            }
            renderAdminTable(sortEntries(entries, 'partyRole', selected));
        });
    }

    document.querySelectorAll('.admin-table th').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-key');
            if (!key) return;
            renderAdminTable(sortEntries(getRsvpEntries(), key));
        });
    });
}

if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', setupAdminPage);
}
