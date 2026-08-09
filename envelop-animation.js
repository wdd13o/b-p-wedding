const envelope = document.querySelector('.envelope');
let redirectTimer = null;

if (envelope) {
    envelope.addEventListener('click', () => {
        envelope.classList.toggle('open');
        if (redirectTimer) {
            clearTimeout(redirectTimer);
        }
        redirectTimer = setTimeout(() => {
            window.location.href = 'souvenir.html';
        }, 9000);
    });
}
