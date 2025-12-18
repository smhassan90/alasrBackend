const form = document.getElementById('deleteAccountForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmCheckbox = document.getElementById('confirmDelete');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
}

function hideMessage() {
    messageDiv.style.display = 'none';
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Hide previous messages
    hideMessage();
    
    // Get values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const isChecked = confirmCheckbox.checked;
    
    // Validation - show error if any field is missing or checkbox is not checked
    if (!email || !password || !isChecked) {
        showMessage('Please fill in all fields and check the confirmation box', 'error');
        return;
    }
    
    // All validations passed - call delete API to deactivate the user
    loadingDiv.classList.add('active');
    form.style.display = 'none';
    
    try {
        // Call delete account API - this will deactivate the user (set is_active = false)
        const protocol = window.location.protocol;
        const host = window.location.host;
        const apiUrl = protocol + '//' + host + '/api/v1/auth/delete-account';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        loadingDiv.classList.remove('active');
        
        if (response.ok && data.success) {
            showMessage('✅ Your account has been successfully deleted. You will be redirected shortly...', 'success');
            setTimeout(function() {
                window.location.href = '/';
            }, 3000);
        } else {
            form.style.display = 'block';
            const errorMsg = data.message || 'Failed to delete account. Please check your email and password.';
            showMessage('❌ ' + errorMsg, 'error');
        }
    } catch (error) {
        loadingDiv.classList.remove('active');
        form.style.display = 'block';
        showMessage('❌ An error occurred: ' + error.message + '. Please try again later.', 'error');
    }
});

