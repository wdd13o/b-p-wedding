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

    // Use numeric Date constructor to avoid parsing differences across browsers
    const eventDate = new Date(2026, 8, 5, 0, 0, 0); // September 5, 2026 (month is 0-based)
    if (isNaN(eventDate.getTime())) return;
    const now = new Date();
    let diff = eventDate - now;
    // Debugging output for deployed environments
    console.debug('countdown: eventDate=', eventDate, 'now=', now, 'diff=', diff);
    if (isNaN(diff)) {
        // Avoid writing NaN into the UI; show placeholders and bail
        monthsEl.textContent = '--';
        weeksEl.textContent = '--';
        daysEl.textContent = '--';
        hoursEl.textContent = '--';
        minutesEl.textContent = '--';
        secondsEl.textContent = '--';
        return;
    }
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

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('months')) {
        setInterval(updateCountdown, 1000);
        updateCountdown();
    }
});

// Envelope Seal Click
const seal = document.getElementById('seal');
if (seal) {
    seal.addEventListener('click', function() {
        window.location.href = 'invitation.html';
    });
}

const RSVP_API_URL = '/api/rsvps';
const RSVP_STORAGE_KEY = 'weddingRsvps';

const rsvpForm = document.getElementById('rsvp-form');
const rsvpMessage = document.getElementById('rsvp-message');
if (rsvpForm) {
    rsvpForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(rsvpForm);
        const name = formData.get('name')?.trim();
        const phone = formData.get('phone')?.trim();
        const attendance = formData.get('attendance');
        const partyRole = formData.get('partyRole');
        const talent = formData.get('talent');

        if (!name || !phone || !attendance || !partyRole) {
            rsvpMessage.textContent = 'Please complete your name, phone number, party affiliation, and attendance response.';
            rsvpMessage.className = 'rsvp-message error';
            return;
        }

        const entry = {
            name,
            phone,
            attendance,
            guests: formData.get('guests') || '0',
            partyRole,
            song: formData.get('song') || '',
            talent: talent || '',
            submittedAt: new Date().toISOString()
        };

        try {
            await saveRsvpEntry(entry);
            rsvpMessage.textContent = 'Thank you! Your RSVP has been received.';
            rsvpMessage.className = 'rsvp-message success';
            rsvpForm.reset();
        } catch (error) {
            console.error('Failed to save RSVP entry', error);
            rsvpMessage.textContent = 'There was a problem saving your RSVP. Please try again.';
            rsvpMessage.className = 'rsvp-message error';
        }
    });
}

function getLocalRsvpEntries() {
    try {
        const stored = localStorage.getItem(RSVP_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to parse RSVP entries', error);
        return [];
    }
}

function saveLocalRsvpEntry(entry) {
    const entries = getLocalRsvpEntries();
    entries.push(entry);
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(entries));
}

async function getRsvpEntries() {
    try {
        const response = await fetch(RSVP_API_URL, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);

        const entries = await response.json();
        return Array.isArray(entries) ? entries : [];
    } catch (error) {
        console.warn('RSVP API unavailable, falling back to browser storage.', error);
        return getLocalRsvpEntries();
    }
}

async function saveRsvpEntry(entry) {
    try {
        const response = await fetch(RSVP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(entry)
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Using local browser storage because the shared RSVP API is unavailable.', error);
        saveLocalRsvpEntry(entry);
        return entry;
    }
}

function clearRsvpEntries() {
    localStorage.removeItem(RSVP_STORAGE_KEY);
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

async function setupAdminPage() {
    const adminContent = document.getElementById('admin-content');
    const warning = document.getElementById('admin-warning');
    if (!adminContent || !warning) return;

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

    const entries = sortEntries(await getRsvpEntries(), 'submittedAt');
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
        refreshBtn.addEventListener('click', async () => {
            const entries = await getRsvpEntries();
            renderAdminTable(sortEntries(entries, 'submittedAt', 'desc'));
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            exportRsvpsToCsv(await getRsvpEntries());
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (affiliationSort) {
        affiliationSort.addEventListener('change', async () => {
            const selected = affiliationSort.value;
            const entries = await getRsvpEntries();
            if (!selected) {
                renderAdminTable(sortEntries(entries, 'submittedAt', 'desc'));
                return;
            }
            renderAdminTable(sortEntries(entries, 'partyRole', selected));
        });
    }

    document.querySelectorAll('.admin-table th').forEach(header => {
        header.addEventListener('click', async () => {
            const key = header.getAttribute('data-key');
            if (!key) return;
            renderAdminTable(sortEntries(await getRsvpEntries(), key));
        });
    });
}

if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', setupAdminPage);
}

