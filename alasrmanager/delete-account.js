const form = document.getElementById('deleteAccountForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmCheckbox = document.getElementById('confirmDelete');
const loadingDiv = document.getElementById('loading');
const errorDialog = document.getElementById('errorDialog');
const successDialog = document.getElementById('successDialog');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

function showErrorDialog(message) {
    errorMessage.textContent = message;
    errorDialog.classList.add('active');
}

function closeErrorDialog() {
    errorDialog.classList.remove('active');
}

function showSuccessDialog(message) {
    successMessage.textContent = message;
    successDialog.classList.add('active');
}

function closeSuccessDialog() {
    successDialog.classList.remove('active');
    window.location.href = '/';
}

// Make functions globally accessible for onclick handlers
window.closeErrorDialog = closeErrorDialog;
window.closeSuccessDialog = closeSuccessDialog;

// Close dialog when clicking outside
errorDialog.addEventListener('click', function(e) {
    if (e.target === errorDialog) {
        closeErrorDialog();
    }
});

successDialog.addEventListener('click', function(e) {
    if (e.target === successDialog) {
        closeSuccessDialog();
    }
});

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const isChecked = confirmCheckbox.checked;
    
    // Validation - show error dialog if any field is missing or checkbox is not checked
    if (!email || !password || !isChecked) {
        showErrorDialog('Please fill in all fields and check the confirmation box');
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
            // Show success dialog
            showSuccessDialog('Your account has been successfully deleted. You will be redirected to the home page.');
        } else {
            form.style.display = 'block';
            const errorMsg = data.message || 'Failed to delete account. Please check your email and password.';
            showErrorDialog(errorMsg);
        }
    } catch (error) {
        loadingDiv.classList.remove('active');
        form.style.display = 'block';
        showErrorDialog('An error occurred: ' + error.message + '. Please try again later.');
    }
});

