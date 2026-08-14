const envelope = document.querySelector('.envelope');
const seal = document.querySelector('.seal');
const mobileHint = document.querySelector('.mobile-hint');
let redirectTimer = null;

function startRedirectTimer() {
    if (redirectTimer) clearTimeout(redirectTimer);
    redirectTimer = setTimeout(() => {
        window.location.href = 'souvenir.html';
    }, 9000);
}

if (envelope) {
    envelope.addEventListener('click', () => {
        envelope.classList.toggle('open');
        startRedirectTimer();
    });
}

if (seal) {
    // On Android (or narrow screens), clicking the seal should show a vertical layout
    seal.addEventListener('click', (e) => {
        e.stopPropagation();
        const isAndroid = /Android/i.test(navigator.userAgent);
        if (isAndroid || window.innerWidth <= 700) {
            envelope.classList.toggle('vertical');
            envelope.classList.add('open');
            if (mobileHint) mobileHint.classList.remove('show');
            startRedirectTimer();
        } else {
            // fallback: behave like envelope click on larger screens
            envelope.classList.toggle('open');
            startRedirectTimer();
        }
    });
}

// Show the mobile hint briefly on load for small screens
function showMobileHint() {
    if (!mobileHint) return;
    if (window.innerWidth <= 700) {
        mobileHint.classList.add('show');
        setTimeout(() => mobileHint.classList.remove('show'), 4500);
    }
}

// Run immediately in case script is after DOM (it is), and also on resize
showMobileHint();
window.addEventListener('resize', () => {
    if (window.innerWidth > 700 && mobileHint) mobileHint.classList.remove('show');
});
