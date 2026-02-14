// Modal Logic for Gallery
document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const theme = body.classList.contains('dark-theme') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        });
    }

    const modal = document.getElementById('myModal');
    if (modal) {
        const images = document.querySelectorAll('.slider img, .card-grid img');
        const modalImg = document.getElementById("img01");
        const captionText = document.getElementById("caption");
        const span = document.getElementsByClassName("close")[0];

        images.forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener('click', function () {
                modal.style.display = "block";
                modalImg.src = this.src;
                captionText.innerHTML = this.alt || "Gallery Image";
            });
        });

        if (span) {
            span.onclick = function () {
                modal.style.display = "none";
            }
        }

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    }

    // WhatsApp Button
    if (!document.querySelector('.floating-whatsapp')) {
        const waBtn = document.createElement('a');
        waBtn.href = "https://wa.me/9779705944749";
        waBtn.className = "floating-whatsapp";
        waBtn.target = "_blank";
        waBtn.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="Chat">';
        document.body.appendChild(waBtn);
    }

    // Payment Logic
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', (e) => {
            const qr = document.getElementById('payment-qr');
            if (qr) qr.style.display = (e.target.value === 'esewa' || e.target.value === 'khalti' || e.target.value === 'bank') ? 'block' : 'none';

            const bankDetails = document.getElementById('bank-details');
            if (bankDetails) bankDetails.style.display = (e.target.value === 'bank') ? 'block' : 'none';
        });
    }

    // Country Code Logic
    const countryCode = document.getElementById('countryCode');
    const otherCountryCode = document.getElementById('otherCountryCode');
    if (countryCode && otherCountryCode) {
        countryCode.addEventListener('change', function () {
            otherCountryCode.disabled = this.value !== 'other';
            if (this.value !== 'other') otherCountryCode.value = '';
        });
    }

    // Refresh Quote
    rotateQuote();
});

(function () {
    emailjs.init("m49Zx1Rz_ZorThNTn");
})();

function toggleMenu() {
    const nav = document.querySelector('nav');
    const hamburger = document.querySelector('.hamburger');
    if (nav) {
        nav.classList.toggle('active');
    }
    if (hamburger) {
        hamburger.classList.toggle('active');
    }
}

function toggleSection(id) {
    const box = document.getElementById(id);
    if (!box) return;

    const content = box.querySelector('.toggle-content');
    const isAlreadyActive = content.classList.contains('active');

    // Close all other toggles first (optional, following "minimal" intent)
    document.querySelectorAll('.toggle-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.toggle-box').forEach(b => b.classList.remove('active'));

    if (!isAlreadyActive) {
        content.classList.add('active');
        box.classList.add('active');
    }
}

function handleCountryCodeChange(select, inputId) {
    const customInput = document.getElementById(inputId);
    if (!customInput) return;

    if (select.value === 'other') {
        customInput.style.display = 'block';
        customInput.required = true;
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
    }
}

// EmailJS Submission logic
const SERVICE_ID = "service_u7b2mkr";
const REGISTRATION_TEMPLATE = "template_75i6nkr";
const CONTACT_TEMPLATE = "template_75i6nkr";

// Registration form handler
const registrationForm = document.getElementById('registration-form');
if (registrationForm) {
    registrationForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const btn = event.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = "Sending...";
        btn.disabled = true;

        emailjs.sendForm(SERVICE_ID, REGISTRATION_TEMPLATE, this)
            .then(() => {
                showSuccessOverlay();
                this.reset();
                if (typeof updateHeightPlaceholder === 'function') updateHeightPlaceholder();
            }, (err) => {
                alert("Failed to send: " + JSON.stringify(err));
            })
            .finally(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            });
    });
}

// Contact form handler
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const btn = event.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = "Sending...";
        btn.disabled = true;

        emailjs.sendForm(SERVICE_ID, CONTACT_TEMPLATE, this)
            .then(() => {
                showSuccessOverlay();
                this.reset();
            }, (err) => {
                alert("Failed to send: " + JSON.stringify(err));
            })
            .finally(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            });
    });
}

function showSuccessOverlay() {
    let overlay = document.getElementById('registration-success-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'registration-success-overlay';
        overlay.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 3rem; border-radius: 20px; text-align: center; max-width: 450px; width: 90%;">
                <div style="color: #2e7d32; font-size: 4rem; margin-bottom: 1rem;"><i class="fas fa-check-circle"></i></div>
                <h2 style="color: #2e7d32; margin-bottom: 1rem;">Success!</h2>
                <p style="color: #666; margin-bottom: 2rem;">Your registration has been submitted successfully.</p>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="background: #2e7d32; color: white; padding: 0.8rem 2rem; border: none; border-radius: 5px; cursor: pointer; width: 100%;">Close</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

const quotes = [
    "The body benefits from movement, and the mind benefits from stillness. - Sakyong Mipham",
    "Yoga is the journey of the self, through the self, to the self. - The Bhagavad Gita",
    "Yoga does not change the way we see things, it transforms the person who sees. - B.K.S. Iyengar",
    "Inhale the future, exhale the past.",
    "The pose begins when you want to leave it."
];

function rotateQuote() {
    const textElem = document.getElementById('quote-text');
    if (textElem) {
        textElem.innerHTML = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
    }
}
